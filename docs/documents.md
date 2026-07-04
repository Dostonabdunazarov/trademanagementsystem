# Бизнес-логика документов

Документ — центральная сущность системы. Он проходит жизненный цикл по статусам, а при проведении атомарно меняет склад, баланс контрагента и (для оплат) остаток кассы.

Источник истины — [`ConfirmDocumentCommandHandler.cs`](../TradeMS/TradeMS.Application/Features/Documents/Commands/ConfirmDocument/ConfirmDocumentCommandHandler.cs) и [`CancelDocumentCommandHandler.cs`](../TradeMS/TradeMS.Application/Features/Documents/Commands/CancelDocument/CancelDocumentCommandHandler.cs).

## Типы документов (`DocumentType`)

| Тип | Смысл | Товарные строки | Оплата (касса) |
|---|---|---|---|
| `Expense` | Расход (продажа клиенту) | да | — |
| `Income` | Приход (закупка у поставщика) | да | — |
| `ReturnFromCustomer` | Возврат от клиента | да | — |
| `ReturnToSupplier` | Возврат поставщику | да | — |
| `PayOut` | Выдача денег | — | из кассы (−) |
| `PayIn` | Получение денег | — | в кассу (+) |

## Статусы (`DocumentStatus`)

```
Draft ──confirm──▶ Confirmed ──cancel──▶ Cancelled
  │
  └──delete──▶ (удалён)
```

- **`Draft`** — черновик. Можно редактировать (`PUT`) и удалять (`DELETE`). На склад/балансы не влияет.
- **`Confirmed`** — проведён. Склад и балансы обновлены. Удаление запрещено (только `cancel`).
- **`Cancelled`** — отменён. Все эффекты проведения откатаны.

Удаление (`DELETE`) разрешено **только для `Draft`**.

## Проведение (`POST /documents/{id}/confirm`)

Выполняется **в одной транзакции БД** с ретраем при конфликте оптимистичной блокировки (до 3 попыток — `Stock`/`Counterparty`/`Account` используют `xmin`).

Шаги:

1. **Проверки.** Документ существует и принадлежит компании; для не-админа совпадает филиал; статус — `Draft`.
2. **Курс в базовую валюту — считает сервер, не клиент.** Берётся последний курс из `exchange_rates` для пары `валюта_документа → базовая` на дату ≤ даты документа. Если базовая валюта не настроена или курс не найден — ошибка. `TotalAmountBase = round(TotalAmount × курс, 2)`. Клиентский `ExchangeRate` в расчёте **не участвует** (перезаписывается серверным).
3. **Склад.** Дельта на строку:

   | Тип | Склад |
   |---|---|
   | `Expense`, `ReturnToSupplier` | −количество |
   | `Income`, `ReturnFromCustomer` | +количество |
   | `PayOut`, `PayIn` | не трогается |

   Если записи `stock` для товара в филиале нет — создаётся с нуля. Уход остатка в минус запрещён (ошибка «Insufficient stock»).

4. **Баланс контрагента** (`counterparties.Balance`). Соглашение о знаке:
   - **> 0** — контрагент должен нам (дебитор);
   - **< 0** — мы должны контрагенту (кредитор).

   | Тип | Δ Balance | Смысл |
   |---|---|---|
   | `Expense` | `+ TotalAmountBase` | клиент задолжал |
   | `ReturnFromCustomer` | `− TotalAmountBase` | долг клиента уменьшился |
   | `PayOut` | `− TotalAmountBase` | заплатили клиенту / клиент забрал деньги |
   | `Income` | `− TotalAmountBase` | мы задолжали поставщику |
   | `ReturnToSupplier` | `+ TotalAmountBase` | наш долг поставщику уменьшился |
   | `PayIn` | `+ TotalAmountBase` | получили деньги от поставщика/клиента |

5. **Касса** (только `PayIn`/`PayOut`, если задан `AccountId`).
   - `PayIn` → `Balance += TotalAmountBase`; `PayOut` → `Balance −= TotalAmountBase`.
   - **Валюта кассы должна совпадать с базовой** — иначе ошибка (баланс кассы ведётся в базовой валюте).
   - Если у документа есть контрагент — создаётся запись `payments`.
6. **Финализация.** `Status = Confirmed`, `ConfirmedAt = now`, коммит транзакции, запись в аудит (`DOC_CONFIRM`).

## Отмена (`POST /documents/{id}/cancel`)

Обратная операция для проведённого документа: откатывает склад, баланс контрагента, остаток кассы и связанную оплату, затем ставит статус `Cancelled`. Так же выполняется в транзакции с ретраем. Детали — в [`CancelDocumentCommandHandler.cs`](../TradeMS/TradeMS.Application/Features/Documents/Commands/CancelDocument/CancelDocumentCommandHandler.cs).

## Связанные сущности

- **`document_lines`** — товарные строки (кол-во, цена, скидка, итог).
- **`payments`** — создаётся при проведении `PayIn`/`PayOut` с контрагентом.

Структура полей — в [Базе данных](database.md#документы).
