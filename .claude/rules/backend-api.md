---
paths:
  - "TradeMS/TradeMS.Api/**/*.cs"
  - "TradeMS/TradeMS.Application/**/*.cs"
---

# Бэкенд: эндпоинты и handlers

## Эндпоинт (`TradeMS.Api/Endpoints/*Endpoints.cs`)
- В эндпоинте только разбор claims, сборка команды и `mediator.Send`. Никаких запросов к БД и бизнес-правил.
- `companyId` всегда берётся из claim `company_id`, никогда из тела или query.
- Для не-Admin `branchId` берётся из claim `branch_id` и **перекрывает** любой `branchId` из запроса, в том числе в GET-списках, get-by-id и `/reports/*`. Эталон — `GET /documents` в `DocumentEndpoints.cs`. Если у не-Admin нет `branch_id`, вернуть 403, а не «без фильтра».
- Админские действия: `.RequireAuthorization(p => p.RequireRole("Admin"))`.
- Пагинация: `Math.Clamp(pageSize, 1, 200)` и `Math.Max(1, page)`.

## Handler
- Каждая загрузка по id: `.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == request.CompanyId)`, при отсутствии — `KeyNotFoundException`.
- **Внешние id из запроса** (`CounterpartyId`, `ProductId`, `AccountId`, `BranchId`, `CurrencyId`, `GroupId`, `ParentId`) проверяются на принадлежность компании, `DeletedAt == null` и активность **до** сохранения. Иначе получаем IDOR или FK-500 (AUDIT SEC-1).
- Бизнес-ошибки — `BusinessException(code, message, args)`. Новый `code` добавить в константы (например, `DocumentErrorCodes`) **и** в `errors.codes.*` обеих локалей UI (`trade-ms-ui/src/i18n/locales/ru.ts`, `uz.ts`).
- Голый `InvalidOperationException` не бросать: `GlobalExceptionHandler` отдаёт его текст клиенту.
- Изменяющие команды пишут аудит: `await auditLogger.LogAsync(AuditActions.X, entityType, entityId, details)`. Новое действие добавлять в `TradeMS.Domain/Entities/AuditActions.cs`.
- В отчётах и списках: `Where(x => x.DeletedAt == null)`. Документы в отчётах — только `Status == Confirmed`.
- Агрегаты считать в БД (`SumAsync`, `GroupBy` → `Select`), не грузить все строки в память через `ToListAsync()`.

## Валидатор
- У каждой изменяющей команды есть `<Command>Validator : AbstractValidator<<Command>>` в той же папке.
- Суммы > 0, проценты 0–100, строки ≤ длины колонки. Для кодов, которые UI переводит, — `.WithErrorCode("…")`.

## Не делать
- `FromSqlRaw` с интерполяцией строк (только `FromSqlInterpolated` или параметры).
- Возврат сущностей EF наружу — только DTO.
- Логирование паролей, токенов, хэшей.
