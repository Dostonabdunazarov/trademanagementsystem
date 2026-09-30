using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeMS.Infrastructure.Migrations
{
    /// <summary>
    /// 1. Нумерация документов: счётчик document_counters вместо Count+1 и уникальный индекс
    ///    (CompanyId, Number). Существующие дубли номеров перенумеровываются (первый по Id сохраняет номер).
    /// 2. Выручка/себестоимость строк в базовой валюте (TotalBase/CostBase) — заполняются для уже
    ///    проведённых документов по данным документа, закупочной цене и курсам на дату документа.
    /// 3. Documents.UpdatedAt (и xmin как row-version — системная колонка, создавать не нужно).
    /// 4. Единственная базовая валюта — partial unique index.
    /// </summary>
    public partial class HardenDocumentNumbersAndLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: `xmin` is a PostgreSQL system column that already exists on every table — it is
            // mapped as a row-version only in the EF model, so the generated AddColumn is omitted.

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CostBase",
                table: "document_lines",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalBase",
                table: "document_lines",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "document_counters",
                columns: table => new
                {
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    LastNumber = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_counters", x => new { x.CompanyId, x.Type, x.Year });
                });

            // ── 1. Счётчики из существующих номеров вида PFX-YYYY-NNNNN ────────────────
            migrationBuilder.Sql("""
                INSERT INTO document_counters ("CompanyId", "Type", "Year", "LastNumber")
                SELECT "CompanyId", "Type",
                       split_part("Number", '-', 2)::int,
                       max(split_part("Number", '-', 3)::int)
                FROM documents
                WHERE "Number" ~ '^[A-Z]{3}-[0-9]{4}-[0-9]{1,9}$'
                GROUP BY "CompanyId", "Type", split_part("Number", '-', 2)::int;
                """);

            // ── 1b. Дубли номеров: первый по Id сохраняет номер, остальные получают следующий
            //        номер из счётчика своего типа и года документа.
            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    r record;
                    next_no int;
                    prefix text;
                BEGIN
                    FOR r IN
                        SELECT "Id", "CompanyId", "Type", EXTRACT(YEAR FROM "Date")::int AS yr
                        FROM (
                            SELECT d.*, row_number() OVER (PARTITION BY "CompanyId", "Number" ORDER BY "Id") AS rn
                            FROM documents d
                        ) x
                        WHERE rn > 1
                        ORDER BY "Id"
                    LOOP
                        INSERT INTO document_counters ("CompanyId", "Type", "Year", "LastNumber")
                        VALUES (r."CompanyId", r."Type", r.yr, 1)
                        ON CONFLICT ("CompanyId", "Type", "Year")
                        DO UPDATE SET "LastNumber" = document_counters."LastNumber" + 1
                        RETURNING "LastNumber" INTO next_no;

                        prefix := CASE r."Type"
                            WHEN 'Expense' THEN 'EXP'
                            WHEN 'Income' THEN 'INC'
                            WHEN 'ReturnFromCustomer' THEN 'RFC'
                            WHEN 'ReturnToSupplier' THEN 'RTS'
                            WHEN 'PayOut' THEN 'POT'
                            WHEN 'PayIn' THEN 'PIN'
                            ELSE 'DOC' END;

                        UPDATE documents
                        SET "Number" = prefix || '-' || r.yr || '-' || lpad(next_no::text, 5, '0')
                        WHERE "Id" = r."Id";
                    END LOOP;
                END $$;
                """);

            // ── 2. TotalBase: выручка строки в базовой валюте с учётом скидки документа ─────
            migrationBuilder.Sql("""
                UPDATE document_lines l
                SET "TotalBase" = round(l."Total" * (1 - d."DiscountPercent" / 100) * d."ExchangeRate", 2)
                FROM documents d
                WHERE d."Id" = l."DocumentId" AND d."Status" <> 'Draft';
                """);

            // Остаток округления — в самую крупную строку, чтобы сумма строк = TotalAmountBase.
            migrationBuilder.Sql("""
                WITH diff AS (
                    SELECT d."Id" AS doc_id, d."TotalAmountBase" - sum(l."TotalBase") AS delta
                    FROM documents d
                    JOIN document_lines l ON l."DocumentId" = d."Id"
                    WHERE d."Status" <> 'Draft'
                    GROUP BY d."Id", d."TotalAmountBase"
                    HAVING d."TotalAmountBase" - sum(l."TotalBase") <> 0
                ), target AS (
                    SELECT DISTINCT ON (l."DocumentId") l."Id" AS line_id, diff.delta
                    FROM document_lines l
                    JOIN diff ON diff.doc_id = l."DocumentId"
                    ORDER BY l."DocumentId", l."TotalBase" DESC, l."Id"
                )
                UPDATE document_lines l
                SET "TotalBase" = l."TotalBase" + target.delta
                FROM target
                WHERE l."Id" = target.line_id;
                """);

            // ── 2b. CostBase: закупочная цена товара, переведённая в базовую валюту по курсу
            //        на дату документа (прямой курс, иначе обратный, иначе 1:1). Это лучшая
            //        доступная оценка: исторических закупочных цен в БД нет.
            migrationBuilder.Sql("""
                WITH base AS (SELECT "Id" FROM currencies WHERE "IsBase" ORDER BY "Code" LIMIT 1)
                UPDATE document_lines l
                SET "CostBase" = round(l."Quantity" * p."PriceBuy" * COALESCE(
                    CASE WHEN p."CurrencyId" = (SELECT "Id" FROM base) THEN 1 END,
                    (SELECT r."Rate" FROM exchange_rates r
                      WHERE r."FromCurrencyId" = p."CurrencyId" AND r."ToCurrencyId" = (SELECT "Id" FROM base)
                        AND r."Date" <= d."Date"
                      ORDER BY r."Date" DESC LIMIT 1),
                    (SELECT 1 / r."Rate" FROM exchange_rates r
                      WHERE r."FromCurrencyId" = (SELECT "Id" FROM base) AND r."ToCurrencyId" = p."CurrencyId"
                        AND r."Date" <= d."Date" AND r."Rate" > 0
                      ORDER BY r."Date" DESC LIMIT 1),
                    1), 2)
                FROM documents d, products p
                WHERE d."Id" = l."DocumentId" AND p."Id" = l."ProductId" AND d."Status" <> 'Draft';
                """);

            // ── 4. Если базовых валют вдруг несколько — оставляем одну (иначе индекс не создастся).
            migrationBuilder.Sql("""
                UPDATE currencies SET "IsBase" = false
                WHERE "IsBase" AND "Id" <> (SELECT "Id" FROM currencies WHERE "IsBase" ORDER BY "Code" LIMIT 1);
                """);

            // Составной индекс (CompanyId, Number) покрывает поиск по CompanyId.
            migrationBuilder.DropIndex(
                name: "IX_documents_CompanyId",
                table: "documents");

            migrationBuilder.CreateIndex(
                name: "IX_documents_CompanyId_Number",
                table: "documents",
                columns: new[] { "CompanyId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_currencies_IsBase",
                table: "currencies",
                column: "IsBase",
                unique: true,
                filter: "\"IsBase\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Перенумерованные дубли номеров не возвращаются к старым значениям — это намеренно.
            migrationBuilder.DropTable(
                name: "document_counters");

            migrationBuilder.DropIndex(
                name: "IX_documents_CompanyId_Number",
                table: "documents");

            migrationBuilder.DropIndex(
                name: "IX_currencies_IsBase",
                table: "currencies");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "CostBase",
                table: "document_lines");

            migrationBuilder.DropColumn(
                name: "TotalBase",
                table: "document_lines");

            migrationBuilder.CreateIndex(
                name: "IX_documents_CompanyId",
                table: "documents",
                column: "CompanyId");
        }
    }
}
