-- =============================================================
-- Seed: приход (Income) и расход (Expense) — Январь–Июнь 2026
-- По 7-8 документов каждого типа на каждый месяц
-- Используем уже существующие в БД Company, Branch, Currency, User, Product
--
-- ЗАПУСК:  psql -U postgres -d tradems -f seed-income-expense-2026.sql
-- =============================================================

BEGIN;

-- 0. Сохраняем ссылки во временную таблицу
CREATE TEMP TABLE _base ON COMMIT DROP AS
SELECT
    (SELECT "Id" FROM "companies" LIMIT 1)                         AS company_id,
    (SELECT "Id" FROM "branches" LIMIT 1)                         AS branch_id,
    (SELECT "Id" FROM "currencies" WHERE "IsBase" = true LIMIT 1) AS currency_id,
    (SELECT "Id" FROM "users" LIMIT 1)                            AS user_id;

-- Проверка
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _base WHERE company_id IS NOT NULL) THEN
        RAISE EXCEPTION 'В таблице companies нет ни одной записи.';
    END IF;
END $$;

-- 1. Список активных продуктов
CREATE TEMP TABLE _products ON COMMIT DROP AS
SELECT
    "Id"        AS product_id,
    "PriceBuy"  AS price_buy,
    "PriceSell" AS price_sell,
    ROW_NUMBER() OVER (ORDER BY "Id") AS rn,
    COUNT(*) OVER() AS total
FROM "products"
WHERE "IsActive" = true;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _products) THEN
        RAISE EXCEPTION 'В таблице products нет активных продуктов.';
    END IF;
END $$;

-- 2. Генерируем план документов: 6 мес × 8 строк
--    Чётные месяцы = 8 док, нечётные = 7
CREATE TEMP TABLE _doc_plan ON COMMIT DROP AS
SELECT
    m.mon,
    n.num,
    CASE WHEN n.num <= 4 THEN 'Income' ELSE 'Expense' END AS doc_type,
    make_date(2026, m.mon, LEAST((n.num * 4 - 1), 28)) AS doc_date
FROM generate_series(1, 6) AS m(mon)
CROSS JOIN generate_series(1, 8) AS n(num)
WHERE NOT (m.mon % 2 = 1 AND n.num = 8);

-- 3. Вставляем документы и сохраняем Id во временную таблицу
CREATE TEMP TABLE _inserted_docs ON COMMIT DROP AS
WITH inserted AS (
    INSERT INTO "documents" (
        "CompanyId", "BranchId", "Type", "Number", "Date",
        "CounterpartyId", "CurrencyId", "ExchangeRate",
        "TotalAmount", "TotalAmountBase", "DiscountPercent", "DiscountAmount",
        "Note", "Status", "CreatedBy", "CreatedAt", "ConfirmedAt"
    )
    SELECT
        b.company_id,
        b.branch_id,
        dp.doc_type,
        CASE dp.doc_type
            WHEN 'Income'  THEN 'INC-' || LPAD(dp.mon::text, 2, '0') || '-' || LPAD(dp.num::text, 3, '0')
            ELSE               'EXP-' || LPAD(dp.mon::text, 2, '0') || '-' || LPAD(dp.num::text, 3, '0')
        END,
        dp.doc_date,
        NULL,
        b.currency_id,
        1,
        0, 0, 0, 0,
        'Seed ' || TO_CHAR(dp.doc_date, 'YYYY-MM'),
        'Confirmed',
        b.user_id,
        dp.doc_date::timestamp AT TIME ZONE 'UTC',
        dp.doc_date::timestamp AT TIME ZONE 'UTC'
    FROM _doc_plan dp, _base b
    ORDER BY dp.doc_date, dp.doc_type, dp.num
    RETURNING "Id", "Type", "Number", "Date"
)
SELECT * FROM inserted;

-- 4. Генерируем строки документов (2 товара на документ)
CREATE TEMP TABLE _lines ON COMMIT DROP AS
SELECT
    d."Id"          AS document_id,
    d."Type"        AS doc_type,
    p.product_id,
    CASE d."Type"
        WHEN 'Income'  THEN p.price_buy
        WHEN 'Expense' THEN p.price_sell
    END             AS price,
    ((p.rn - 1) % 5) * 5 + 5 AS qty
FROM _inserted_docs d
CROSS JOIN LATERAL (
    SELECT product_id, price_buy, price_sell, rn
    FROM _products
    WHERE rn = (ABS(hashtext(d."Number" || '_1')) % total) + 1
    UNION ALL
    SELECT product_id, price_buy, price_sell, rn
    FROM _products
    WHERE rn = (ABS(hashtext(d."Number" || '_2')) % total) + 1
) p;

-- 5. Вставляем строки документов
CREATE TEMP TABLE _inserted_lines ON COMMIT DROP AS
WITH inserted AS (
    INSERT INTO "document_lines" (
        "DocumentId", "ProductId", "Quantity", "Price",
        "DiscountPercent", "DiscountPrice", "Total"
    )
    SELECT
        l.document_id,
        l.product_id,
        l.qty,
        l.price,
        0, 0,
        l.qty * l.price
    FROM _lines l
    RETURNING "DocumentId", "Total"
)
SELECT * FROM inserted;

-- 6. Обновляем TotalAmount и TotalAmountBase в документах
UPDATE "documents" d
SET
    "TotalAmount"     = t.total_sum,
    "TotalAmountBase" = t.total_sum
FROM (
    SELECT "DocumentId", SUM("Total") AS total_sum
    FROM _inserted_lines
    GROUP BY "DocumentId"
) t
WHERE d."Id" = t."DocumentId";

COMMIT;

-- =============================================================
-- Проверка результата
-- =============================================================
SELECT
    "Type"                                     AS "Тип",
    TO_CHAR("Date", 'YYYY-MM')                AS "Месяц",
    COUNT(*)                                   AS "Кол-во док.",
    TO_CHAR(SUM("TotalAmount"), 'FM999G999G999D00') AS "Сумма"
FROM "documents"
WHERE "Date" >= '2026-01-01' AND "Date" < '2026-07-01'
  AND "Type" IN ('Income', 'Expense')
GROUP BY "Type", TO_CHAR("Date", 'YYYY-MM')
ORDER BY "Месяц", "Тип";

-- Примеры документов
SELECT
    "Number", "Type", "Date", "Status",
    TO_CHAR("TotalAmount", 'FM999G999G999D00') AS "Сумма"
FROM "documents"
WHERE "Date" >= '2026-01-01' AND "Date" < '2026-07-01'
  AND "Type" IN ('Income', 'Expense')
ORDER BY "Date", "Type", "Number"
LIMIT 15;
