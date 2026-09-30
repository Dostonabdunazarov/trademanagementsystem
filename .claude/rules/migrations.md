---
paths:
  - "TradeMS/TradeMS.Infrastructure/Migrations/**"
  - "TradeMS/TradeMS.Infrastructure/Persistence/**"
  - "TradeMS/TradeMS.Domain/Entities/**"
---

# EF Core: модель и миграции

- Конфигурация модели — только в `AppDbContext.OnModelCreating`: таблицы, индексы, `HasPrecision(18,2)` для денег, enum как строка, `xmin` row-version.
- После изменения сущности или конфигурации: `dotnet ef migrations add <PascalCaseName> -p TradeMS.Infrastructure -s TradeMS.Api` (из `TradeMS/`). Snapshot и `*.Designer.cs` руками не править.
- Проверка, что модель и snapshot совпадают: `dotnet ef migrations has-pending-model-changes -p TradeMS.Infrastructure -s TradeMS.Api`.
- **Миграция применяется автоматически при старте API в проде** (`MigrateAsync` в `Program.cs`). Отсюда требования:
  - `Down()` реализован и реально откатывает;
  - NOT NULL колонка на существующей таблице — с `defaultValue` или с заполнением через `migrationBuilder.Sql(...)` до смены nullability;
  - уникальный индекс на существующих данных — сначала убедиться (или очистить в миграции), что дублей нет, иначе API не стартует;
  - изменение данных (балансы, остатки): сначала бэкап-таблица `<table>_backup_<yyyymmdd>` в той же миграции, а удаление бэкапа — **отдельной** миграцией после подтверждения пользователем. Паттерн: `FixPaymentBalanceSemantics` → `DropCounterpartyBalanceBackup`.
- Не удалять и не переименовывать старые миграции, которые уже в `main`: они применены в проде.
- Сущность с `CompanyId` получает индекс, начинающийся с `CompanyId`.
