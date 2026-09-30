---
name: new-feature
description: Добавить сквозную фичу в TradeMS — команду/запрос MediatR с валидатором, эндпоинт, TS-типы и хук TanStack Query, UI и переводы ru/uz, тесты. Использовать, когда нужно новое действие или экран, затрагивающее и API, и UI.
---

# /new-feature — сквозная фича

Аргумент: краткое описание фичи. Перед кодом посмотреть ближайший аналог в той же области и повторять его стиль. Аналог для CRUD — `Features/Counterparties`, для документов — `Features/Documents`.

## 1. Application (`TradeMS/TradeMS.Application/Features/<Область>/`)
- `Commands/<Действие>/<Действие>Command.cs` — `record … : IRequest<TDto>`. Первыми параметрами идут `Guid CompanyId` и, если нужно, `Guid? BranchId` и `Guid UserId`.
- `<Действие>CommandHandler.cs`:
  - primary constructor с `IAppDbContext db, IAuditLogger auditLogger`;
  - все выборки фильтруются по `CompanyId`, внешние id проверяются на принадлежность компании;
  - бизнес-ошибки — `BusinessException`;
  - в конце запись в аудит.
- `<Действие>CommandValidator.cs` — обязателен для команд.
- DTO — в `DTOs/`, это `record`.
- Новые коды: `AuditActions` в `TradeMS.Domain/Entities/AuditActions.cs`, коды ошибок — рядом с `DocumentErrorCodes`.

## 2. Api (`TradeMS/TradeMS.Api/Endpoints/<Область>Endpoints.cs`)
- Маршрут в существующей группе. `companyId` берётся из claims; для не-Admin `branchId` тоже из claims.
- Роль: `.RequireAuthorization(p => p.RequireRole("Admin"))`, если действие админское. Не забыть `.WithSummary(...)`.
- Новая группа регистрируется в `Program.cs` под `/api`.

## 3. Если меняется модель
Вызвать скилл `/ef-migration`.

## 4. Фронтенд (`trade-ms-ui/src/`)
- `api/<область>.ts` — функция на `apiClient`.
- `api/hooks/use<Область>.ts` — `useQuery`/`useMutation`. **Тип повторяет DTO один в один.** Мутация инвалидирует зависимые ключи.
- UI в `features/<область>/`, компоненты из `components/ui`. Ошибки выводить через `toast.error(getApiErrorMessage(err, t))`.
- Тексты — ключи в `i18n/locales/ru.ts` **и** `uz.ts`. Если перевода на узбекский нет, спросить пользователя или пометить `// TODO uz` и сказать об этом в отчёте.

## 5. Тесты
- Бэкенд: интеграционный тест в `TradeMS.IntegrationTests/Tests/<Область>/`. Наследоваться от `SeededIntegrationTestBase` и повторять стиль соседних тестов. Покрыть успех, валидацию, чужую компанию или филиал (404/403) и роль.
- Фронтенд: `src/test/components/<область>/`, MSW-хендлер в `src/test/msw/handlers`.

## 6. Документация и проверка
- Новый эндпоинт → `docs/api.md`, новая бизнес-логика → соответствующий `docs/*.md`.
- В конце запустить `/verify` и ревью субагентом `tenant-security-reviewer`.
