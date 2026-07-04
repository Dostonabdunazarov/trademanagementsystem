# База данных

СУБД — **PostgreSQL** (Npgsql). Модель определяется кодом в [`AppDbContext.cs`](../TradeMS/TradeMS.Infrastructure/Persistence/AppDbContext.cs) → `OnModelCreating`; сущности — в [`TradeMS.Domain/Entities/`](../TradeMS/TradeMS.Domain/Entities). Имена таблиц — в snake_case (`companies`, `product_groups`, `document_lines`, …).

## Перечисления

Все enum'ы хранятся в БД **строками** (`HasConversion<string>()`) и сериализуются строками в JSON.

| Enum | Значения | Файл |
|---|---|---|
| `AccountType` | `Cash`, `Bank` | [AccountType.cs](../TradeMS/TradeMS.Domain/Enums/AccountType.cs) |
| `CounterpartyType` | `Customer`, `Supplier`, `Both` | [CounterpartyType.cs](../TradeMS/TradeMS.Domain/Enums/CounterpartyType.cs) |
| `DocumentStatus` | `Draft`, `Confirmed`, `Cancelled` | [DocumentStatus.cs](../TradeMS/TradeMS.Domain/Enums/DocumentStatus.cs) |
| `DocumentType` | `Expense`, `Income`, `ReturnFromCustomer`, `ReturnToSupplier`, `PayOut`, `PayIn` | [DocumentType.cs](../TradeMS/TradeMS.Domain/Enums/DocumentType.cs) |
| `PaymentMethod` | `Cash`, `BankTransfer`, `Card` | [PaymentMethod.cs](../TradeMS/TradeMS.Domain/Enums/PaymentMethod.cs) |
| `ProductUnit` | `Pcs`, `Kg`, `M`, `M2`, `M3`, `Litre` | [ProductUnit.cs](../TradeMS/TradeMS.Domain/Enums/ProductUnit.cs) |
| `UserRole` | `Admin`, `Manager`, `Cashier` | [UserRole.cs](../TradeMS/TradeMS.Domain/Enums/UserRole.cs) |

## Сущности

Первичные ключи: у большинства сущностей `Id` — **`Guid`**. Исключения — журнальные/строковые таблицы с автоинкрементным `long` (`bigint`, identity always): `Document`, `DocumentLine`, `Payment`, `AuditLog`.

### Тенант и пользователи

**`companies`** — компания (корень мультитенантности).
`Id`, `Name`, `TaxCode?`, `Address?`, `CreatedAt`.

**`branches`** — филиал компании.
`Id`, `CompanyId → companies`, `Name`, `Address?`.

**`users`** — пользователи.
`Id`, `CompanyId`, `BranchId?` (nullable — админ может быть без филиала), `FullName`, `Email` (**уникальный**), `PasswordHash` (BCrypt), `Role` (`UserRole`), `IsActive`, `CreatedAt`, `DeletedAt?` (мягкое удаление), `RefreshToken?` (хранится SHA-256 хэш), `RefreshTokenExpiry?`, `FailedLoginCount`, `LockoutUntil?`.

### Контрагенты

**`counterparties`**
`Id`, `CompanyId`, `Type` (`CounterpartyType`), `Name`, `Phone?`, `Address?`, `CreditLimit`, `Balance`, `DeletedAt?`, `CreatedAt`.
`Balance` — денормализованное поле, пересчитывается при проведении/отмене документов. Защищено оптимистичной блокировкой (см. ниже).

### Валюты

**`currencies`** — `Id`, `Code` (3 символа, **уникальный**), `Name`, `IsBase`.
**`exchange_rates`** — `Id`, `FromCurrencyId`, `ToCurrencyId`, `Rate` (18,6), `Date`. **Уникальный** индекс `(FromCurrencyId, ToCurrencyId, Date)`.

### Товары и склад

**`product_groups`** — дерево категорий. `Id`, `CompanyId`, `Name`, `ParentId?` (самоссылка, `Restrict` на удаление).
**`products`** — `Id`, `CompanyId`, `GroupId?`, `Name`, `Sku?`, `Barcode?`, `Unit` (`ProductUnit`), `PriceSell`, `PriceBuy`, `CurrencyId`, `IsActive`.
**`stock`** — остатки по филиалам. `Id`, `ProductId`, `BranchId`, `Quantity` (18,4). **Уникальный** индекс `(ProductId, BranchId)`.

### Документы

**`documents`** — `Id` (**bigint**), `CompanyId`, `BranchId`, `Type` (`DocumentType`), `Number`, `Date`, `CounterpartyId?`, `CurrencyId`, `ExchangeRate` (по умолч. 1), `TotalAmount`, `TotalAmountBase`, `DiscountPercent`, `DiscountAmount`, `Note?`, `Amount?`, `PaymentMethod?`, `AccountId?`, `Status` (`DocumentStatus`, по умолч. `Draft`), `CreatedBy`, `CreatedAt`, `ConfirmedAt?`.

Поля `Amount`, `PaymentMethod`, `AccountId` используются документами-оплатами (`PayOut`/`PayIn`).

**`document_lines`** — строки товара. `Id` (bigint), `DocumentId`, `ProductId`, `Quantity`, `Price`, `DiscountPercent`, `DiscountPrice`, `Total`.

**`payments`** — оплаты по документу. `Id` (bigint), `DocumentId`, `CounterpartyId`, `Amount`, `CurrencyId`, `ExchangeRate`, `AmountBase`, `PaymentMethod`, `AccountId?`.

### Кассы и счета

**`accounts`** — `Id`, `CompanyId`, `BranchId`, `Name`, `Type` (`AccountType`), `CurrencyId`, `Balance`.

### Аудит

**`audit_logs`** — `Id` (bigint), `CompanyId`, `UserId?`, `UserEmail?`, `Action`, `EntityType?`, `EntityId?`, `Details?`, `Success` (по умолч. true), `ErrorMessage?`, `IpAddress?`, `UserAgent?`, `CreatedAt`. Индексы: `CreatedAt`, `Action`, `(CompanyId, CreatedAt)`. При удалении пользователя `UserId` → `SetNull`.

> В домене есть класс `LoginAuditLog`, но он **не зарегистрирован** как `DbSet` и в БД не пишется. Все события входа фиксируются через `audit_logs` (константы действий — в [`AuditActions.cs`](../TradeMS/TradeMS.Domain/Entities/AuditActions.cs)).

## Точность decimal

`HasPrecision` задан явно: суммы — `18,2`, количество/остатки — `18,4`, курсы — `18,6`, проценты скидки — `5,2`.

## Оптимистичная блокировка

Системный столбец PostgreSQL `xmin` смаппен как row-version (`.IsRowVersion()`) на трёх сущностях с денормализованными накопительными полями: **`counterparties`** (`Balance`), **`stock`** (`Quantity`), **`accounts`** (`Balance`). Это защищает от потери обновлений при конкурентном проведении/отмене документов — схема при этом не меняется. См. [`AppDbContext.cs`](../TradeMS/TradeMS.Infrastructure/Persistence/AppDbContext.cs) (строки с `xmin`).

## Миграции

- Миграции — в [`TradeMS.Infrastructure/Migrations/`](../TradeMS/TradeMS.Infrastructure/Migrations), сборка миграций — `TradeMS.Infrastructure`.
- **Автоприменение при старте:** `Program.cs` вызывает `await db.Database.MigrateAsync()` в стартовом scope, затем сидит компанию `TradeMS` и администратора (см. [Разработка и деплой](development.md#сидинг-администратора)).
- Design-time фабрика — [`AppDbContextFactory.cs`](../TradeMS/TradeMS.Infrastructure/Persistence/AppDbContextFactory.cs) (нужна для `dotnet ef`).

Команды EF Core:

```bash
cd TradeMS
dotnet ef migrations add <Name> --project TradeMS.Infrastructure --startup-project TradeMS.Api
dotnet ef database update       --project TradeMS.Infrastructure --startup-project TradeMS.Api
```
