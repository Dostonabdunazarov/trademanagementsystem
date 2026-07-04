# API

REST API на ASP.NET Core Minimal API. Все прикладные эндпоинты зарегистрированы под префиксом **`/api`** ([`Program.cs`](../TradeMS/TradeMS.Api/Program.cs) — `app.MapGroup("/api")`). Единственное исключение — health-check.

## Общие правила

- **Формат:** JSON. Enum-значения передаются и принимаются **строками** (`"Expense"`, `"Admin"`, …) благодаря `JsonStringEnumConverter`.
- **Даты:** поля типа `DateOnly` сериализуются как `yyyy-MM-dd` (`DateOnlyJsonConverter`).
- **Аутентификация:** JWT Bearer в заголовке `Authorization: Bearer <accessToken>`. См. [Роли и безопасность](security.md).
- **Ошибки:** необработанные исключения превращаются в ответ ProblemDetails через `GlobalExceptionHandler`.
- **Столбец «Доступ»:**
  - *Аноним* — `.AllowAnonymous()`;
  - *Auth* — любой аутентифицированный пользователь (`.RequireAuthorization()`);
  - *Admin* — только роль `Admin` (`RequireRole("Admin")` или политика `"Admin"`).

> Скоупинг по филиалу для документов и касс задаётся **в коде эндпоинта**, а не политикой роли: не-админ всегда ограничен своим `branch_id`, админ может указывать филиал явно. Подробнее — в [Роли и безопасность](security.md#мультитенантность-и-филиалы).

---

## Health

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/health` | Проверка живости (без префикса `/api`) | Аноним |

## Auth — [`AuthEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/AuthEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| POST | `/api/auth/login` | Вход по email + паролю, выдаёт access + refresh токены | Аноним |
| POST | `/api/auth/refresh` | Обновление access-токена по refresh-токену | Аноним |
| POST | `/api/auth/logout` | Отзыв refresh-токена | Auth |

## Branches — [`BranchEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/BranchEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/branches` | Список филиалов компании | Auth |
| POST | `/api/branches` | Создать филиал | Admin |
| DELETE | `/api/branches/{id:guid}` | Удалить филиал | Admin |

## Product Groups — [`ProductGroupEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/ProductGroupEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/product-groups` | Дерево групп товаров | Auth |
| POST | `/api/product-groups` | Создать группу (опц. `parentId`) | Admin |

## Products — [`ProductEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/ProductEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/products` | Список товаров. Параметры: `search`, `groupId`, `page`, `pageSize` | Auth |
| GET | `/api/products/{id:guid}` | Товар по id | Auth |
| POST | `/api/products` | Создать товар | Admin |
| PUT | `/api/products/{id:guid}` | Обновить товар | Admin |
| DELETE | `/api/products/{id:guid}` | Удалить товар | Admin |

## Counterparties — [`CounterpartyEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/CounterpartyEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/counterparties` | Список. Параметры: `type` (`Customer`/`Supplier`/`Both`), `search`, `page`, `pageSize` | Auth |
| POST | `/api/counterparties` | Создать контрагента | Admin |
| PUT | `/api/counterparties/{id:guid}` | Обновить контрагента | Admin |
| DELETE | `/api/counterparties/{id:guid}` | Мягкое удаление (проставляет `DeletedAt`) | Admin |

## Currencies & Exchange Rates — [`CurrencyEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/CurrencyEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/currencies` | Список валют (базовая первой) | Auth |
| POST | `/api/currencies` | Создать валюту (`isBase=true` снимает флаг с остальных) | Admin |
| GET | `/api/exchange-rates` | Курсы. Без `?date=` — последний курс на каждую пару | Auth |
| POST | `/api/exchange-rates` | Создать/обновить курс для пары валют на дату | Admin |

> Валюты и курсы — **глобальные** (без скоупинга по компании/филиалу).

## Documents — [`DocumentEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/DocumentEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/documents` | Список. Параметры: `type`, `dateFrom`, `dateTo`, `status`, `branchId`, `page`, `pageSize` | Auth |
| GET | `/api/documents/{id:long}` | Документ по id | Auth |
| POST | `/api/documents` | Создать черновик | Auth |
| PUT | `/api/documents/{id:long}` | Обновить черновик | Auth |
| POST | `/api/documents/{id:long}/confirm` | Провести (обновляет склад и баланс контрагента) | Auth |
| POST | `/api/documents/{id:long}/cancel` | Отменить проведённый (откат склада, балансов, оплаты) | Auth |
| DELETE | `/api/documents/{id:long}` | Удалить (только `Draft`) | Auth |

Бизнес-правила проведения/отмены — в [Бизнес-логике документов](documents.md).

## Reports — [`ReportEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/ReportEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/reports/sales-summary` | Проведённые расходы за период, группировка по товару. Параметры: `dateFrom`, `dateTo`, `branchId` (по умолч. последние 30 дней) | Auth |
| GET | `/api/reports/stock-balance` | Остатки по товарам (опц. `branchId`) | Auth |
| GET | `/api/reports/counterparty-balance` | Балансы контрагентов (опц. `type`) | Auth |
| GET | `/api/reports/dashboard` | Выручка/прибыль за период, долг дебиторов, кол-во товаров, данные графика за 12 мес. Параметры: `branchId`, `dateFrom`, `dateTo` | Auth |

## Accounts — [`AccountEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/AccountEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/accounts` | Кассы и банковские счета (опц. `branchId`) | Auth |
| POST | `/api/accounts` | Создать кассу/счёт | Admin |
| DELETE | `/api/accounts/{id:guid}` | Удалить счёт | Admin |

## Users — [`UserEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/UserEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/users` | Список пользователей компании | Auth |
| POST | `/api/users` | Создать пользователя | Admin |
| PUT | `/api/users/{id:guid}` | Обновить пользователя | Admin |
| DELETE | `/api/users/{id:guid}` | Мягкое удаление | Admin |

## Audit Logs — [`AuditLogEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/AuditLogEndpoints.cs)

| Метод | Маршрут | Назначение | Доступ |
|---|---|---|---|
| GET | `/api/audit-logs` | Журнал аудита. Параметры: `userId`, `action`, `dateFrom`, `dateTo`, `success`, `page`, `pageSize` (≤ 500) | Admin |
