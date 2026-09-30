# AGENTS.md — TradeMS

Инструкции для AI-агентов (Claude Code, Codex, Cursor и др.), которые работают с этим репозиторием. Их дополняют правила в `.claude/rules/`, привязанные к путям. Подробная документация лежит в [docs/](docs/README.md), известные проблемы — в [AUDIT_2026-09-29.md](AUDIT_2026-09-29.md).

## Что это

TradeMS — система учёта торговли: продажи, закупки, возвраты, платежи, склад, долги контрагентов, кассы, отчёты. Продукт реальный, развёрнут на `https://savdo.hypex.site`. Интерфейс на двух языках, ru и uz. Базовая валюта UZS, таймзона пользователей UTC+5.

| Часть | Путь | Стек |
|---|---|---|
| Бэкенд | `TradeMS/` | .NET 10 Minimal API, Clean Architecture, MediatR, FluentValidation, EF Core + Npgsql, JWT |
| Фронтенд | `trade-ms-ui/` | React 19 + TS, Vite, TanStack Query, Zustand, React Router 7, Tailwind 4, shadcn/ui, RHF + Zod, i18next |
| БД | — | PostgreSQL 17 (docker), миграции EF применяются при старте API |
| Деплой | `.github/workflows/deploy.yml` | push в `main` → SSH → `docker compose up -d --build` |

## ⚠️ Жёсткие правила

1. **Push в `main` сразу деплоит в прод.** Не пушить без явной просьбы пользователя. Не делать `git push --force`, `reset --hard` и `rebase` опубликованной истории.
2. **Не читать и не выводить `.env`** и любые секреты. Не коммитить секреты: `.env` в `.gitignore`, `appsettings*.json` не должны содержать паролей и ключей.
3. **Не писать в прод-БД.** Любое изменение данных делается только через EF-миграцию, которая проходит ревью. Перед миграцией, меняющей данные (балансы, остатки), сделать бэкап таблицы внутри миграции и отдельной миграцией удалить его после проверки. Пример этого паттерна — `FixPaymentBalanceSemantics` + `DropCounterpartyBalanceBackup`.
4. **Не ломать бизнес-смысл документов** (см. ниже). Любое изменение знаков или формул нужно синхронно внести во все места, перечисленные в разделе «Инварианты».
5. **Каждая команда и каждый запрос скоупятся по `CompanyId`**, а для не-Admin — ещё и по `BranchId`. Это правило без исключений (см. «Безопасность»).

## Команды

```bash
# Бэкенд (из TradeMS/)
dotnet build TradeMS.slnx
dotnet test TradeMS.slnx                 # Docker (Testcontainers) или TRADEMS_TEST_DB=<пустая тестовая БД>, см. docs/development.md#тесты
dotnet run --project TradeMS.Api         # нужны ConnectionStrings__DefaultConnection, Jwt__Secret (≥32), Seed__AdminPassword
dotnet ef migrations add <Name> -p TradeMS.Infrastructure -s TradeMS.Api
dotnet list TradeMS.slnx package --vulnerable --include-transitive

# Фронтенд (из trade-ms-ui/)
npm run dev           # http://localhost:5173, API задаётся в .env.local: VITE_API_URL=http://localhost:5000/api
npx tsc -b            # проверка типов
npm run lint
npm test              # vitest + MSW
npm run build
```

Прежде чем сказать «готово», прогнать проверки для затронутой части: бэкенд — `dotnet build`, фронтенд — `tsc -b`, `lint`, `test`. Интеграционные тесты без Docker запускаются только с `TRADEMS_TEST_DB` (отдельная пустая БД). Если нет ни того, ни другого — так и написать, не выдавать непрогнанное за пройденное. Для этого есть скилл `/verify`.

## Архитектура бэкенда

```
TradeMS.Domain          сущности и enum'ы, без зависимостей
TradeMS.Application     Features/<Область>/{Commands|Queries}/<Действие>/ — record + Handler + Validator; DTOs/
TradeMS.Infrastructure  AppDbContext (вся конфигурация модели в OnModelCreating), Migrations/, Services/
TradeMS.Api             Endpoints/<Область>Endpoints.cs — только claims → команда → mediator.Send
TradeMS.IntegrationTests WebApplicationFactory + Testcontainers + Respawn
```

- **Эндпоинт** читает `company_id`, `branch_id`, `role` и `user_id` из claims и не содержит бизнес-логики. Роли проверяются через `.RequireAuthorization(p => p.RequireRole("Admin"))` или политику `"Admin"`.
- **Handler** работает только через `IAppDbContext` / `ICurrentUserService` / `IAuditLogger`. Каждое изменяющее действие пишет запись в аудит через `IAuditLogger` (коды — `AuditActions.*`).
- **Ошибки:**
  - нарушение бизнес-правила → `BusinessException(code, message, args)`, это 409; `code` совпадает с ключом `errors.codes.<code>` в обеих локалях UI;
  - не найдено → `KeyNotFoundException` (404);
  - нет доступа → `UnauthorizedAccessException` (403/401).
- **Валидация** — FluentValidation-валидатор рядом с командой, выполняется в pipeline (`ValidationBehavior`). У каждой изменяющей команды должен быть валидатор. У правила ставить `.WithErrorCode(...)`, если UI должен показать понятный текст.
- **Деньги** — `decimal`, округление `Math.Round(x, 2, MidpointRounding.AwayFromZero)` (helper `Money()`); колонки `numeric(18,2)`.
- **Конкурентность** — row-version `xmin` на `Stock`, `Counterparty`, `Account`. Проведение и отмена идут в явной транзакции.

## Инварианты предметной области

**Типы документов.** Статусы: `Draft → Confirmed → Cancelled`. Проведённый документ не редактируется и не удаляется, только отменяется.

| Тип | Смысл | Склад | Баланс контрагента | Касса |
|---|---|---|---|---|
| `Expense` | продажа клиенту | − | `+ TotalAmountBase` | — |
| `ReturnFromCustomer` | возврат от клиента | + | `−` | — |
| `Income` | закупка у поставщика | + | `−` | — |
| `ReturnToSupplier` | возврат поставщику | − | `+` | — |
| `PayIn` | **«Приём оплаты» — от клиента** | — | `−` | `+` |
| `PayOut` | **«Выплата» — поставщику** | — | `+` | `−` |

- **Знак баланса:** `Balance > 0` — контрагент должен нам, `< 0` — мы должны ему.
- **Где живут знаки.** Таблица продублирована в `ConfirmDocumentCommandHandler`, `CancelDocumentCommandHandler` (там знак обратный), `GetDashboardSummaryQueryHandler`, миграции `FixPaymentBalanceSemantics`, [docs/documents.md](docs/documents.md) и тексте справки UI. При изменении — править все места.
- **Курс** берётся на сервере из `ExchangeRate`: последний курс на дату документа. Клиентский курс игнорируется при проведении.
- **Касса** ведётся в базовой валюте. Если валюта счёта не базовая — `accountCurrencyMismatch`.
- **Склад** не уходит в минус — ошибка `insufficientStock`. Отмена не должна увести склад в минус — `cancelStockConsumed`.

## Безопасность — чек-лист для любого изменения API

- [ ] Все сущности, загруженные по id, отфильтрованы по `CompanyId == request.CompanyId`. Это касается и **внешних id в теле запроса**: `CounterpartyId`, `ProductId`, `AccountId`, `BranchId`, `CurrencyId`, `GroupId`.
- [ ] Для не-Admin `BranchId` берётся **из токена**, а не из запроса, и применяется и к чтению (списки, get-by-id, отчёты), и к записи. Отсутствие филиала у не-Admin не должно означать «все филиалы».
- [ ] Soft-deleted (`DeletedAt != null`) и неактивные сущности не используются в новых документах и не попадают в отчёты.
- [ ] Роль проверена на эндпоинте, если действие админское.
- [ ] `pageSize` ограничен сверху (`Math.Clamp(pageSize, 1, 200)`).
- [ ] Текст исключения не раскрывает внутренности. Для бизнес-ошибок использовать `BusinessException`, а не голый `InvalidOperationException`.

Роли: `Admin` — всё в компании; `Manager` и `Cashier` — только свой филиал.

## Фронтенд

- **API-слой:** `src/api/<область>.ts` — функции axios; `src/api/hooks/use<Область>.ts` — хуки TanStack Query. **TS-типы должны точно повторять DTO бэкенда** (`TradeMS.Application/Features/**/DTOs`): имена в camelCase, enum'ы строками, nullable → `| null`.
- **Query keys:** `['documents', params]`, `['document', id]`, `['reports', ...]`, `['counterparties', ...]`. После мутаций инвалидировать всё, что зависит от данных. Проведение и отмена документа затрагивают `documents`, `document`, `reports`, `products`, `counterparties`, `accounts`.
- **Ошибки:** показывать `toast.error(getApiErrorMessage(err, t))` из `src/lib/apiError.ts`. Пустых `catch {}` не писать: ESLint `no-empty` уже ругается на существующие.
- **i18n:** любой видимый текст — через `t('…')`, ключи добавлять **в обе** локали, `src/i18n/locales/ru.ts` и `uz.ts`. Хардкод русского текста — это баг.
- **Даты:** «сегодня» — `format(new Date(), 'yyyy-MM-dd')` (date-fns), **не** `toISOString()`: в UTC+5 он сдвигает дату на день назад.
- **Роли в UI:** скрывать админские действия через `useAuthStore(s => s.user?.role === 'Admin')`. Это удобство, а не защита: права проверяет сервер.
- **Стиль:** токены цветов в `src/index.css`. Перед сменой палитры показать варианты на мок-превью UI, а не менять hex вслепую.
- **Тесты:** Vitest + Testing Library + MSW (`src/test/msw/handlers`), рендер через `src/test/utils/renderWithProviders`.

## Миграции EF

- Создавать только через `dotnet ef migrations add`. `AppDbContextModelSnapshot.cs` руками не править.
- Имя в PascalCase по смыслу: `AddDocumentNumberSequence`, `FixPaymentBalanceSemantics`.
- Миграция применяется **автоматически при старте API в проде**. Поэтому она должна быть обратимой (`Down`), не блокировать таблицы надолго и не терять данные.
- Добавление NOT NULL колонки делается с дефолтом или заполнением данных в той же миграции.

## Git

- Коммиты — Conventional Commits, описание на русском: `fix(ui): …`, `feat: …`, `chore(db): …`, `refactor(api): …`. Scope — `ui`, `api`, `db`, `docs`, `auth`, `documents`, `reports`…
- Одна логическая правка — один коммит. Коммитить только по просьбе пользователя.

## Когда закончил

- Обновить `docs/*.md`, если изменилось поведение API, модель или бизнес-логика.
- Если исправлен пункт из `AUDIT_2026-09-29.md`, отметить его там как ✅ и указать коммит.
