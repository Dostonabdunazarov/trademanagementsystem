---
paths:
  - "TradeMS/TradeMS.Application/Features/Documents/**"
  - "TradeMS/TradeMS.Application/Features/Reports/**"
  - "TradeMS/TradeMS.Application/Features/Accounts/**"
  - "TradeMS/TradeMS.Application/Features/Currencies/**"
  - "TradeMS/TradeMS.Application/Features/Counterparties/**"
  - "TradeMS/TradeMS.Domain/Entities/Document*.cs"
  - "TradeMS/TradeMS.Domain/Entities/Stock.cs"
  - "TradeMS/TradeMS.Domain/Entities/Account.cs"
  - "trade-ms-ui/src/features/documents/**"
  - "trade-ms-ui/src/components/dashboard/**"
  - "trade-ms-ui/src/features/reports/**"
---

# Учёт: документы, склад, балансы, отчёты

Это деньги клиента. Ошибка здесь незаметна и накапливается, поэтому любое изменение требует теста и ревью субагентом `ledger-logic-reviewer`.

## Таблица знаков (источник истины)

| Тип | Склад | Контрагент `Balance` | Касса |
|---|---|---|---|
| Expense | − | + | |
| ReturnFromCustomer | + | − | |
| Income | + | − | |
| ReturnToSupplier | − | + | |
| PayIn (от клиента) | | − | + |
| PayOut (поставщику) | | + | − |

- `Balance > 0` — нам должны. **PayIn — «Приём оплаты» от клиента, PayOut — «Выплата» поставщику.** Не путать: это исправлялось миграцией `FixPaymentBalanceSemantics`.
- **Места, которые меняются вместе:** `ConfirmDocumentCommandHandler` ↔ `CancelDocumentCommandHandler` (знак обратный) ↔ `GetDashboardSummaryQueryHandler` ↔ `docs/documents.md` ↔ справка UI (`features/help`) ↔ цвета и знаки в `ActivityFeed` и формах.

## Правила
- **Confirm и Cancel симметричны.** Всё, что делает Confirm (склад, баланс, касса, `payments`), Cancel откатывает в той же транзакции.
- **Деньги:** `decimal` и `Money()` = `Math.Round(x, 2, MidpointRounding.AwayFromZero)`. Округлять итог строки, а не цену за единицу до умножения (AUDIT BIZ-9). На фронте — никаких сумм в `number` сверх отображения; итог считает сервер.
- **Курс:** при проведении — только серверный `ExchangeRate` на дату документа. `TotalAmountBase = Money(TotalAmount * rate)`. Выручка в отчётах — в базовой валюте и с учётом скидки документа (AUDIT BIZ-3).
- **Касса** только в базовой валюте. Счёт документа должен принадлежать компании и филиалу документа.
- **Конкурентность:** `Stock`, `Counterparty`, `Account` имеют `xmin`. `Document` тоже. Retry после `DbUpdateConcurrencyException` обязан вызывать `db.ClearChangeTracker()`, иначе повтор читает закэшированные изменённые сущности.
- **Нумерация документов** — только через `DocumentRules.NextNumberAsync` (атомарный счётчик `document_counters`), не `Count + 1`.
- **Статусы:** редактировать и удалять можно только `Draft`. `Confirmed` можно только отменить.
- **Даты:** `Document.Date` — `DateOnly` в местном времени пользователя (UTC+5). «Сегодня» на сервере — только `BusinessClock.Today`, не `DateTime.UtcNow`.
- **Отчёты:** выручка — `Document.TotalAmountBase` / `DocumentLine.TotalBase`, себестоимость — `DocumentLine.CostBase` (фиксируются при проведении). Не считать от `line.Total` и текущего `Product.PriceBuy`.

## Тесты
Изменение Confirm/Cancel/отчётов → интеграционный тест в `TradeMS.IntegrationTests/Tests/Documents` или `Tests/Reports`: проверять склад, баланс контрагента и кассу **до и после**, для confirm и для cancel.
