---
name: ef-migration
description: Создать и проверить EF Core миграцию TradeMS, безопасную для автоприменения в проде при старте API. Использовать при любом изменении сущностей, AppDbContext, индексов или когда нужно исправить данные в БД.
---

# /ef-migration

Аргумент: имя миграции в PascalCase или описание изменения.

Миграция применится **в проде автоматически** при следующем деплое (`MigrateAsync` в `Program.cs`). Неудачная миграция означает, что API не стартует и прод лежит.

## Шаги
1. Изменить сущность в `TradeMS.Domain/Entities` и конфигурацию в `AppDbContext.OnModelCreating`: точность `(18,2)` для денег, `HasMaxLength` для строк, индекс с `CompanyId` первым.
2. Из `TradeMS/`: `dotnet ef migrations add <Name> -p TradeMS.Infrastructure -s TradeMS.Api`.
3. Прочитать сгенерированный `Up`/`Down` целиком и проверить:
   - [ ] нет неожиданных `DropColumn`/`DropTable` (переименование EF иногда генерирует как drop+add — заменить на `RenameColumn`);
   - [ ] NOT NULL колонка на существующей таблице имеет `defaultValue` или заполняется `migrationBuilder.Sql` до `AlterColumn`;
   - [ ] перед уникальным индексом дубли в существующих данных устранены SQL-ом в этой же миграции;
   - [ ] `Down` корректно откатывает.
4. **Миграция данных** (пересчёт балансов, остатков, исправление знаков):
   - в `Up` сначала `CREATE TABLE <table>_backup_<yyyymmdd> AS SELECT …`, затем изменение;
   - в `Down` — восстановление из бэкапа;
   - удаление бэкапа делается **отдельной** миграцией и только после того, как пользователь подтвердит, что на проде всё верно. Пример: `FixPaymentBalanceSemantics` и `DropCounterpartyBalanceBackup`.
5. `dotnet ef migrations has-pending-model-changes -p TradeMS.Infrastructure -s TradeMS.Api` должно показать, что изменений нет.
6. `dotnet build`. Если есть Docker — `dotnet test`: интеграционные тесты применяют все миграции к чистой БД.
7. Обновить `docs/database.md`.

## Нельзя
- Править `AppDbContextModelSnapshot.cs` или `*.Designer.cs` руками.
- Удалять или редактировать миграции, которые уже есть в `origin/main`.
- Подключаться к прод-БД для «проверки» миграции.
