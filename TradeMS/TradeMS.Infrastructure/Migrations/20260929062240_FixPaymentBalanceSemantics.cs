using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeMS.Infrastructure.Migrations
{
    /// <summary>
    /// Исправление смысла платёжных документов.
    ///
    /// Раньше баланс контрагента считал PayOut («Выплата») оплатой от клиента, а PayIn
    /// («Приём оплаты») — оплатой поставщику, тогда как касса и интерфейс трактовали их
    /// наоборот (PayIn — деньги пришли, PayOut — ушли). Теперь баланс следует кассе:
    /// PayIn уменьшает долг клиента, PayOut уменьшает наш долг поставщику.
    ///
    /// Balance контрагента меняют только подтверждение и отмена документов, поэтому он
    /// точно пересчитывается из подтверждённых документов по новой таблице знаков.
    /// Прежние значения сохраняются в counterparty_balance_backup_20260929 — Down их
    /// восстанавливает. Остатки касс не трогаем: их логика не менялась.
    /// </summary>
    public partial class FixPaymentBalanceSemantics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS counterparty_balance_backup_20260929 AS
                SELECT "Id", "Balance", now() AS "BackedUpAt"
                FROM counterparties;
                """);

            // Знаки — как в ConfirmDocumentCommandHandler:
            // Expense, ReturnToSupplier, PayOut → +; Income, ReturnFromCustomer, PayIn → −.
            migrationBuilder.Sql("""
                UPDATE counterparties c
                SET "Balance" = COALESCE((
                    SELECT SUM(CASE
                        WHEN d."Type" IN ('Expense', 'ReturnToSupplier', 'PayOut') THEN d."TotalAmountBase"
                        ELSE -d."TotalAmountBase"
                    END)
                    FROM documents d
                    WHERE d."CounterpartyId" = c."Id"
                      AND d."Status" = 'Confirmed'
                ), 0);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE counterparties c
                SET "Balance" = b."Balance"
                FROM counterparty_balance_backup_20260929 b
                WHERE b."Id" = c."Id";
                """);

            migrationBuilder.Sql("DROP TABLE IF EXISTS counterparty_balance_backup_20260929;");
        }
    }
}
