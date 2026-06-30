# TradeMS — Полный обзор кода (Code Review)

**Дата:** 2026-06-29
**Охват:** Backend (.NET 8, Clean Architecture, MediatR/CQRS, EF Core, PostgreSQL), Frontend (React + TS + Vite + TanStack Query + Zustand), Infra (Docker, GitHub Actions, Caddy).

Обзор выполнен по областям: безопасность/auth, бизнес-логика документов (склад/баланс/деньги), CRUD + отчёты + persistence, инфраструктура/деплой, фронтенд.

---

## ✅ Исправлено (2026-06-30)

Приоритетные пункты устранены. Бэкенд и фронтенд собираются без ошибок; создана EF-миграция `AddConcurrencyTokensAndCurrencyCodeIndex`.

| # | Что сделано |
|---|-------------|
| SEC-1 | Секреты убраны из `appsettings.json` (пустые значения); `Jwt:Secret` теперь обязателен (≥32 симв., иначе исключение при старте) — [DependencyInjection.cs](TradeMS/TradeMS.Infrastructure/DependencyInjection.cs). ⚠️ Старый секрет в истории git — **требуется ротация** `JWT_SECRET` на сервере. |
| SEC-9 | Добавлены `ValidAlgorithms = HS256` и `ClockSkew = 30s`. |
| INFRA-3 | CORS читает `Cors:AllowedOrigins`; `AllowAnyOrigin` только в Development. Прод-origin задаётся `FRONTEND_ORIGIN` в [docker-compose.yml](docker-compose.yml). |
| INFRA-4 | Добавлен `security_opt: no-new-privileges:true` на все 3 сервиса compose. |
| SEC-3 | `RequireRole("Admin")` на create/delete Branch, Account, Currency, ExchangeRate. |
| BIZ-1/BIZ-2 | `xmin` row-version токен на Stock/Counterparty/Account + явная транзакция и retry-цикл в [ConfirmDocumentCommandHandler.cs](TradeMS/TradeMS.Application/Features/Documents/Commands/ConfirmDocument/ConfirmDocumentCommandHandler.cs). |
| BIZ-3 | Платёж требует `Amount > 0` (валидатор); интеграционные тесты переведены на контракт `amount`. |
| BIZ-H3 | Добавлены `CreateDocumentCommandValidator` / `UpdateDocumentCommandValidator` (qty/price > 0, discount 0–100, rate > 0). |
| DATA-1 | Guard на hard-delete Product/Branch/Account при наличии ссылок → 409 Conflict. |
| DATA-2 | Отчёт баланса фильтрует `DeletedAt == null`. |
| DATA-3 | Уникальный индекс на `Currency.Code`. |
| FE-1 | `_retry` проставляется в очереди → нет бесконечного refresh-цикла. |
| FE-3/FE-12 | Инвалидация `['document', id]` + reports/products/counterparties на update/confirm/delete. |
| FE-4/FE-6/FE-14 | PaymentForm: валидация (amount/currency/account/counterparty), try/catch + тост, cleanup таймера. |

**Осталось (не входило в первый заход):** SEC-6/7/8/10/13/14, BIZ-H1 (Cancel-команда), BIZ-H2/M1 (валюта счёта/серверный курс), BIZ-M2 (округление), DATA-4/5/6, INFRA-5/6/7/8, FE-2/5/7–11/13/15–18. См. детали ниже.

### Второй заход (2026-06-30) — исправлено ещё

| # | Что сделано |
|---|-------------|
| BIZ-H1 | Добавлена команда `CancelDocument` + endpoint `POST /documents/{id}/cancel`: откатывает склад/баланс контрагента/баланс счёта и удаляет платёж в транзакции с retry, ставит статус `Cancelled`. Откат не даёт уйти складу в минус, если товар уже израсходован. |
| BIZ-H2 | При платеже валюта счёта должна совпадать с базовой (иначе `TotalAmountBase` портил бы баланс счёта) — [ConfirmDocumentCommandHandler.cs](TradeMS/TradeMS.Application/Features/Documents/Commands/ConfirmDocument/ConfirmDocumentCommandHandler.cs). |
| BIZ-M1 | Курс берётся **с сервера** из таблицы `ExchangeRate` (последний на дату документа), `TotalAmountBase` пересчитывается при confirm; клиентский курс игнорируется. Нет курса → ошибка. |
| BIZ-M2 | Вся денежная математика округляется до 2 знаков (`Money()` helper) в Create/Update/Confirm. |
| SEC-10 | Refresh-токен хранится как SHA-256 хэш (`HashRefreshToken`), сверка по хэшу, ротация. Добавлен `POST /auth/logout` (отзыв токена). Удалён мёртвый `ValidateRefreshToken`. |
| DATA-4 | Фильтр аудит-логов по `DateTo` теперь `< DateTo.AddDays(1)` — не режет записи того же дня. |
| DATA-5 | `BuildTree` групп товаров переведён на `ToLookup` (O(n) вместо O(n²)). |
| SEC-13 | Валидаторы `CreateUser`/`UpdateUser`: пароль ≥8 симв. (на update — только если задан), email-формат. |
| BIZ-L2 | Невалидный `PaymentMethod` отклоняется валидатором, а не превращается молча в `Cash`. |

> Схема БД не менялась (всё — логика), новая миграция не нужна. `dotnet ef` подтверждает: pending-изменений модели нет.
>
> ⚠️ SEC-10: после деплоя все текущие refresh-токены станут невалидны (в БД теперь хэши) — пользователей один раз разлогинит, это ожидаемо. Фронту стоит вызывать `POST /auth/logout` при выходе.

> ⚠️ После деплоя нужно: применить миграцию (`db.Database.MigrateAsync()` делает это автоматически), задать на сервере `FRONTEND_ORIGIN` и **новый** `JWT_SECRET`.

---

## 🔴 Сводка приоритетных проблем (исправить в первую очередь)

| # | Область | Проблема | Серьёзность |
|---|---------|----------|-------------|
| SEC-1 | Auth/Infra | JWT-секрет и пароль БД захардкожены в `appsettings.json` (в git) | Critical |
| BIZ-2 | Документы | Нет оптимистичной блокировки → потеря обновлений склада/балансов при конкуренции | Critical |
| BIZ-3 | Документы | Платёж с `lines` без `amount` подтверждается как нулевой (деньги не двигаются) | Critical |
| DATA-1 | CRUD | Hard-delete Product/Branch/Account без проверки ссылок → каскадная потеря данных | Critical |
| SEC-3 | Auth | Branch/Account/Currency/ExchangeRate без проверки роли — эскалация привилегий | High |
| FE-1 | Frontend | Возможный бесконечный цикл refresh при параллельных 401 | Critical |

---

# 1. Безопасность и аутентификация (Backend)

## Critical

### SEC-1. Захардкоженный JWT-секрет и пароль БД в git-tracked `appsettings.json`
- `TradeMS.Api/appsettings.json:13` — `"Secret": "super-secret-key-change-in-production-minimum-32-chars"`
- `TradeMS.Api/appsettings.json:10` — `Password=postgres` в `DefaultConnection`
- Ключ читается в `JwtService.cs:16` и `DependencyInjection.cs:42` через `config["Jwt:Secret"]`. В проде docker-compose переопределяет через `Jwt__Secret=${JWT_SECRET}`, **но** если переменная пуста/не задана — приложение молча падает на захардкоженный секрет.
- **Импакт:** любой, у кого есть доступ к репо (или кто знает этот общеизвестный placeholder), может подделать валидный JWT для любого пользователя/роли/компании → полный обход аутентификации.
- **Фикс:** удалить секрет и пароль из tracked-файла; ротация JWT-секрета (считать скомпрометированным — он уже в истории git); сделать `Jwt:Secret` обязательным (бросать исключение на старте, если отсутствует или равен дефолту). Очистка только рабочего файла недостаточна — секрет в истории git.

## High

### SEC-3. Отсутствуют проверки роли на критичных endpoint-ах
Все остальные мутации (products, counterparties, users) требуют `RequireRole("Admin")`, но:
- `BranchEndpoints.cs:25-39` — `POST /branches` и `DELETE /branches/{id}` только `.RequireAuthorization()`. Кассир/Менеджер может создавать и **удалять филиалы** (каскадно затрагивает документы, счета, склад).
- `AccountEndpoints.cs:27-47` — `POST /accounts` и `DELETE /accounts/{id}` без проверки роли. Любой пользователь может удалить кассу/банковский счёт.
- `CurrencyEndpoints.cs:26-31, 46-52` — `POST /currencies` и `POST /exchange-rates` без проверки роли. Любой пользователь может задать курс обмена, влияющий на оценку всех документов → манипуляция финансовыми данными.
- **Фикс:** добавить `RequireRole("Admin")` на эти эндпоинты.

### SEC-6. Возможное отсутствие company-скоупинга для Currency/ExchangeRate
- `CurrencyEndpoints.cs` — нет `GetCompanyId(user)` нигде в файле. Если валюты/курсы задумывались как per-company — это межтенантная утечка чтения/записи. Подтвердить по модели данных.

## Medium

### SEC-7. `CreateUserCommandHandler` не проверяет принадлежность `BranchId` компании
- `CreateUserCommandHandler.cs:21-32` — `BranchId` из запроса сохраняется без проверки, что филиал принадлежит `request.CompanyId`. Возможно назначение пользователя в филиал другой компании.

### SEC-8. Энумерация email
- `LoginCommandHandler.cs:47` — ветка блокировки раскрывает существование аккаунта и время блокировки; `CreateUserCommandHandler.cs:16-19` возвращает `"Email '{x}' is already in use"`.

### SEC-10. Refresh-токен хранится в открытом виде; нет ревокации
- `User.cs:19`, `LoginCommandHandler.cs:70`, `RefreshTokenCommandHandler.cs:24` — refresh-токен в БД без хэширования. Утечка бэкапа/реплики → готовые к использованию токены.
- Один слот на пользователя (логин со второго устройства инвалидирует первое), нет logout/revocation endpoint.
- `JwtService.cs:46-50` — `ValidateRefreshToken` всегда возвращает `(true, "")` — мёртвый/вводящий в заблуждение код.
- Нет reuse-detection при ротации украденного токена.

## Low
- **SEC-9.** `DependencyInjection.cs:33-43` — не задан `ClockSkew` (по умолчанию 5 мин → токены живут на 5 мин дольше `ExpiryMinutes`); не запинён `ValidAlgorithms` на HS256.
- **SEC-11.** `Program.cs:32-36` — `AllowAnyOrigin()` (см. INFRA-3).
- **SEC-12.** `appsettings.json:8` — `AllowedHosts: "*"`.
- **SEC-13.** Нет `CreateUserCommandValidator` → пароли пользователей без минимальной сложности при создании.
- **SEC-14.** `CurrentUserService.cs:36-38` — `X-Forwarded-For` берётся без проверки доверенного прокси → спуфинг IP в аудит-логах.

### ✅ Проверено и НЕ является багом
- `sub`→`NameIdentifier` маппинг корректен (`JwtSecurityTokenHandler` мапит `sub` по умолчанию).
- Тенант-изоляция для Products/Counterparties/Users/Documents/Reports/Accounts(чтение)/ProductGroups/AuditLogs корректна — фильтр по `CompanyId` из claim, не из тела запроса.
- Документы корректно форсируют non-Admin к своему `branch_id` (`DocumentEndpoints.cs:37-39, 71-77`).
- Есть защита от брутфорса (блокировка после 5 попыток).

---

# 2. Бизнес-логика документов (склад, баланс, деньги)

## Critical

### BIZ-1 / BIZ-2. Нет транзакции и оптимистичной блокировки вокруг confirm
- `ConfirmDocumentCommandHandler.cs:45-147` — мутирует Stock, Counterparty.Balance, Account.Balance, вставляет Payment, меняет Status в одном `SaveChangesAsync`. Один SaveChanges атомарен на уровне БД, но **нет** контроля конкурентности.
- `ConfirmDocumentCommandHandler.cs:68, 107, 125` — паттерн read-modify-write (`stock.Quantity += delta`, `cp.Balance += delta`, `account.Balance += delta`). Нет `RowVersion`/concurrency-token нигде в проекте (проверено grep-ом).
- **Импакт:** два документа, подтверждённые одновременно для одного продукта/контрагента/счёта, перезаписывают значение друг друга → одно обновление молча теряется. Склад и деньги навсегда расходятся, без исключения. **Самый серьёзный класс багов для учётной системы.**
- **Фикс:** добавить `RowVersion` в `Stock`, `Counterparty`, `Account`; обернуть Confirm в явную транзакцию с retry на конфликт конкурентности.

### BIZ-3. Платёжные документы с lines получают нулевую сумму
- `CreateDocumentCommandHandler.cs:42-47, 71` — для `PayOut`/`PayIn`: `totalAmount = request.Amount ?? 0m`, `lines = []`. Линии отбрасываются, всё держится на поле `Amount`.
- Интеграционные тесты (`PaymentDocumentTests.cs:51-64...`) создают платежи через **lines** без `amount` → `totalAmount = 0`, при confirm дельта баланса = 0 вместо реальной суммы.
- **Импакт:** платёж, который не двигает деньги, но выглядит «подтверждённым»; долг контрагента не уменьшается. Тихая потеря финансовых данных.
- **Фикс:** согласовать контракт — либо учитывать `lines` для платежей, либо требовать `Amount` (валидировать non-null/positive).

## High

### BIZ-H1. Подтверждённые документы невозможно отменить/откатить
- Нет Cancel-обработчика (проверено). `DocumentStatus.Cancelled` существует (`DocumentStatus.cs:7`), но нигде не присваивается. Delete/Update жёстко блокируют не-Draft (`DeleteDocumentCommandHandler.cs:24`, `UpdateDocumentCommandHandler.cs:26`).
- **Импакт:** подтверждённый документ с ошибочными количествами/ценами/контрагентом нельзя исправить через API. Пользователи пойдут править БД вручную.

### BIZ-H2. Несовпадение валюты счёта и документа
- `ConfirmDocumentCommandHandler.cs:121-125` — `account.Balance += doc.TotalAmountBase` (базовая валюта) без проверки, что `Account.CurrencyId == doc.CurrencyId`. Счёт в USD + платёж в UZS → сумма в UZS прибавляется к USD-счёту.

### BIZ-H3. Нет валидации: отрицательные/нулевые количества и цены принимаются
- Нет валидаторов для документов (проверено find-ом). Не отклоняются `Quantity <= 0`, `Price < 0`, `DiscountPercent > 100 / < 0`, `ExchangeRate <= 0`.
- **Импакт:** скидка >100% → отрицательный итог → переворот знака баланса; `ExchangeRate = 0` обнуляет все `TotalAmountBase`; отрицательное количество двигает склад в неверную сторону.
- **Фикс:** FluentValidation-валидаторы на create/update документа.

### BIZ-H4. Защита от отрицательного склада обходится при конкуренции
- `ConfirmDocumentCommandHandler.cs:68-72` — проверка `newQty < 0` читает устаревшее количество (нет concurrency-контроля, BIZ-2). Два параллельных расхода оба проходят проверку и уводят склад в минус.

## Medium
- **BIZ-M1.** `CreateDocumentCommandHandler.cs:69` — `TotalAmountBase = totalAmount * request.ExchangeRate` доверяет курсу от клиента; таблица `ExchangeRate` никогда не консультируется при создании/подтверждении.
- **BIZ-M2.** Нет округления денежной математики (`CreateDocumentCommandHandler.cs:52, 69, 96, 104`) → `Sum(lines.Total) != stored TotalAmount` на копейки.
- **BIZ-M3.** `ConfirmDocumentCommandHandler.cs:150-154` — повторная загрузка `FirstAsync(d => d.Id == request.Id)` без фильтра `CompanyId` (нарушает инвариант тенант-изоляции).
- **BIZ-M4.** `GetExchangeRatesQueryHandler.cs:27-34` — нет инверсии обратного направления курса; если хранится только `USD→UZS`, поиск `UZS→USD` ничего не находит.

## Low
- **BIZ-L1.** `CreateDocumentCommandHandler.cs:29-34` — генерация номера документа через `Count+1` без уникального ограничения → дубликаты номеров при конкуренции.
- **BIZ-L2.** Невалидный `PaymentMethod` парсится в `null`, затем при confirm → `Cash` (`?? PaymentMethod.Cash`). «Card» с опечаткой записывается как Cash.
- **BIZ-L3.** `ConfirmDocumentCommandHandler.cs:114, 128` — Payment-запись пишется только если заданы и `AccountId`, и `CounterpartyId`; иначе баланс меняется без записи в ledger.

### ✅ Проверено и НЕ является багом
- Логика знака `debtorDebt` в дашборде консистентна с `ConfirmDocumentCommandHandler`.
- Decimal-precision консистентны (money 18,2; qty 18,4; rate 18,6; percent 5,2).
- Stock имеет уникальный индекс `(ProductId, BranchId)`; ExchangeRate — `(From, To, Date)`.

---

# 3. CRUD, отчёты, persistence

## Critical

### DATA-1. Hard-delete Product/Branch/Account без проверки ссылок → каскадная потеря данных
- `DeleteProductCommandHandler.cs:19` — `Remove(product)` без проверки `Stock`/`DocumentLine`.
- `DeleteBranchCommandHandler.cs:22` — без проверки `Stock`/`Document`/`Account`/`User`.
- `DeleteAccountCommandHandler.cs:22` — без проверки `Payment`/`Document`.
- Связи в `AppDbContext.cs` с дефолтным `DeleteBehavior` (Cascade для обязательных FK). Удаление проданного продукта **каскадно удалит `DocumentLine`**, искажая подтверждённые финансовые документы и историю отчётов.
- Counterparty получил soft-delete (`DeletedAt`) именно ради этого — а Product/Branch/Account нет. Непоследовательно и опасно.
- **Фикс:** блокировать удаление при наличии ссылок ИЛИ перейти на soft-delete.

## High

### DATA-2. Soft-deleted контрагенты попадают в отчёт баланса
- `GetCounterpartyBalanceQueryHandler.cs:15-16` — фильтр только по `CompanyId`, без `c.DeletedAt == null` (в отличие от `GetCounterpartiesQueryHandler.cs:16`). Нет глобального query-filter в `AppDbContext`, поэтому каждый потребитель должен фильтровать вручную — и этот не фильтрует. Итоги отчёта неверны.
- **Фикс:** добавить `HasQueryFilter(c => c.DeletedAt == null)` для Counterparty в `AppDbContext`.

### DATA-3. Нет уникального ограничения на `Currency.Code`; in-code dedup race-prone
- `AppDbContext.cs:73-79`, `CreateCurrencyCommandHandler.cs:15-18` — нет `HasIndex(x => x.Code).IsUnique()`; уникальность только через `AnyAsync`. TOCTOU-гонка → дубликаты кодов и несколько `IsBase = true`.

## Medium
- **DATA-4.** `GetAuditLogsQueryHandler.cs:25-26` — `CreatedAt <= DateTo` при `DateTime` с временем → отсекает записи того же дня. Фикс: `< DateTo.AddDays(1)`.
- **DATA-5.** `GetProductGroupsQueryHandler.cs:20-27` — рекурсивный `BuildTree` O(n²); заменить на `ToLookup(g => g.ParentId)`.
- **DATA-6.** `GetSalesSummaryQueryHandler.cs:15, 25, 35` — 3 отдельных round-trip к БД по одному фильтру.

## Low
- **DATA-7.** Нет `CreateAccountCommandValidator`/`CreateBranchCommandValidator` → пустой `Name` доходит до БД и даёт 500 вместо 400.
- **DATA-8.** `ValidationBehavior.cs:15` — синхронный `Validate` вместо `ValidateAsync` (упадёт, если кто-то добавит async-правило).

---

# 4. Инфраструктура, Docker, CI/CD

> Git-tracking подтверждён: `.env`, `docker-compose.override.yml`, `trade-ms-ui/.env.local` **НЕ** в git (хорошо). Но `appsettings.json` и `appsettings.Development.json` **в git** с секретами (см. SEC-1).

## High

### INFRA-3. CORS разрешает любой origin безусловно
- `Program.cs:32-36` — `AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()` как default-политика во **всех** окружениях, не ограничено dev. Любой сайт может вызывать API от имени пользователя с токеном.
- **Фикс:** ограничить известными origin фронтенда в проде.

### INFRA-4. Контейнеры запускаются от root; нет `no-new-privileges`
- `TradeMS.Api/Dockerfile` (нет `USER`), `trade-ms-ui/Dockerfile` (nginx от root). Ни один сервис в compose не имеет `security_opt: [no-new-privileges:true]`, `user:`, `cap_drop`.
- **Фикс:** добавить non-root `USER app` (.NET) и nginx-unprivileged; `no-new-privileges:true` на все 3 сервиса.

## Medium
- **INFRA-5.** `.env:3-4` (`ADMIN_PASSWORD=test-password`) и `appsettings.Development.json:10` (`AdminPassword: CHANGE_ME`) — слабые/placeholder креды засевают реального admin-пользователя (`Program.cs:45-49`). Проверить, что прод-значение сильное.
- **INFRA-6.** Плавающие теги базовых образов (`node:22-alpine`, `nginx:alpine`, `aspnet:10.0`) → невоспроизводимые сборки. Нет `mem_limit`/`cpus` → возможна перегрузка хоста.
- **INFRA-7.** `deploy.yml:26-30` — деплой через SSH делает `git reset --hard origin/main` + `docker compose up -d --build` от root в `/root/...`. Инъекций нет (все значения из `secrets.*`), но сборка на проде, без registry/rollback, root-уровень.

## Low
- **INFRA-8.** `deploy.yml:29` — сборка образов на проде каждый деплой (всплеск ресурсов, секреты на хосте). Лучше собирать в CI и пуллить тег.
- **INFRA-9.** ✅ `docker-compose.yml:12` — порт БД `127.0.0.1:5433:5432` (только loopback) — корректно.
- **INFRA-10.** ✅ `trade-ms-ui/Dockerfile:8-9` — `VITE_API_URL=/api` (путь, не секрет) — утечки нет.

---

# 5. Frontend (React/TS)

## Critical

### FE-1. Возможный бесконечный цикл refresh при параллельных 401
- `src/api/axios.ts:34-41` — при одновременных 401 запросы из очереди (`failedQueue`) перезапускаются через `apiClient(original)`, но `original._retry` им **не** проставляется. Если повторный запрос снова 401 → снова входит в интерсептор, `_retry` falsy → новый refresh. Цикл.
- **Фикс:** проставлять `original._retry = true` в ветке очереди перед повтором.

### FE-2. Токены в `localStorage` (кража через XSS)
- `src/store/auth.store.ts:29-45`, `src/utils/constants.ts:3` — `accessToken` и `refreshToken` персистятся через zustand `persist` (localStorage). XSS → кража обоих токенов, включая долгоживущий refresh.
- **Фикс:** как минимум — refresh в httpOnly-cookie.

## High
- **FE-3.** `useDocumentMutations.ts:35-56` — мутации инвалидируют `['documents']`, но не `['document', id]` (ключ из `useDocument.ts:39`). После update/confirm повторное открытие показывает устаревший документ (`staleTime: 30_000`).
- **FE-4.** `PaymentForm.tsx:175-184, 160-173` — `handleSaveDraft` без guard → может отправить `counterpartyId: null`, `amount: 0`. `handleConfirm` проверяет `!amount`, но `amount="0"` truthy → нулевой/отрицательный платёж подтверждается.
- **FE-5.** `DocumentForm.tsx:184, 238-247, 661-663` — `useStockBalance(activeBranch?.id)`; для non-admin `activeBranch` = `null` → склад резолвится неверно, гард блокирует **все** продукты для Expense/ReturnToSupplier («отсутствует на складе»).
- **FE-6.** `PaymentForm.tsx:175-178, 180-184` — `async`-обработчики без try/catch → ошибки API становятся unhandled rejection, без тоста (в DocumentForm обработка есть, в PaymentForm — нет).

## Medium
- **FE-7.** `useDocumentForm.ts:74-86` — `addLine` при дубле продукта суммирует количество, но пересчитывает по **старым** price/discount, теряя только что введённые пользователем.
- **FE-8.** `DocumentForm.tsx:148-153` → `useDocumentForm.ts:74-86` — загрузка документа с дублирующимися строками продукта схлопывает их в одну (искажение сохранённого документа).
- **FE-9.** `DocumentForm.tsx:519-523, 545-546` — при смене валюты курс ставится в `state.exchangeRate` (не из `useExchangeRates`); очистка поля → `|| 1` → молча `1`, мис-прайсинг всего документа.
- **FE-10.** `DocumentForm.tsx:139-155`, `PaymentForm.tsx:62,111-125` — `formLoaded.current` не сбрасывается при смене `editId`/`viewId`; зависимость эффекта только `[existingDoc]`.
- **FE-11.** `DocumentForm.tsx:137`, `PaymentForm.tsx:60` — `parseInt(urlId)` на `?id=abc` → `NaN`, `enabled: id != null` true → лишний запрос `GET /documents/NaN`.
- **FE-12.** `useDocumentMutations.ts:58-64` — `useDeleteDocument` инвалидирует только `['documents']`; reports/products/counterparties остаются устаревшими.

## Low
- **FE-13.** `DocumentForm.tsx:661` — `stockByProductId != null` всегда true (это всегда Map) → ветка `'—'` недостижима, показывается `0`.
- **FE-14.** `DocumentForm.tsx:200-203` — `setTimeout` тоста без cleanup → предупреждение при размонтировании.
- **FE-15.** `format.ts:12-14` — `formatDate` бросает `RangeError` на невалидной/пустой дате (нет guard, в отличие от `formatNumber`).
- **FE-16.** `format.ts:3-10` — `formatCurrency` форсит 0 дробных → суб-единичные суммы (не-UZS) молча округляются в отображении.
- **FE-17.** `router.tsx:31-36`, `MainLayout.tsx:85-88` — role-gating только на клиенте (`user` в подменяемом localStorage); убедиться, что бэкенд форсит Admin на `/audit-logs` (он форсит — см. SEC-блок).
- **FE-18.** `QuantityDialog.tsx:47-53` — `handleConfirm` проверяет только `q > 0`, не `q <= stock`; для outbound можно добавить больше, чем на складе (полагается на отклонение бэкендом).

### ✅ Проверено и НЕ является багом
- Инъекция токена в request-интерсепторе (`axios.ts:10-16`) корректна.
- Ключи list-запросов стабильны; `placeholderData: (prev) => prev` уместен.
- Refresh-вызов использует «голый» `axios` (не `apiClient`) — нет рекурсии интерсептора. Хорошо.

---

# Рекомендуемый порядок исправлений

1. **SEC-1** — убрать секреты из `appsettings.json`, ротация JWT-секрета, сделать `Jwt:Secret` обязательным.
2. **BIZ-2 / BIZ-1** — `RowVersion` на Stock/Counterparty/Account + явная транзакция с retry в Confirm. *Топ-приоритет для учётной системы.*
3. **BIZ-3** — согласовать контракт суммы платежа (lines vs Amount), валидировать `Amount > 0`.
4. **DATA-1** — блокировать hard-delete при ссылках или soft-delete для Product/Branch/Account.
5. **SEC-3** — `RequireRole("Admin")` на Branch/Account/Currency/ExchangeRate.
6. **BIZ-H3** — FluentValidation для документов (qty/price > 0, discount 0–100, rate > 0).
7. **FE-1 / FE-3 / FE-5 / FE-4+FE-6** — цикл refresh, инвалидация `['document', id]`, склад для non-admin, валидация PaymentForm.
8. **DATA-2 / DATA-3** — фильтр soft-delete в отчёте баланса, уникальный индекс на `Currency.Code`.
9. **INFRA-3 / INFRA-4** — ограничить CORS, non-root контейнеры + `no-new-privileges`.

---

*Сгенерировано параллельным мульти-агентным обзором (5 областей). Каждая находка проверена по исходному коду. Помеченные ✅ пункты проверены и не являются багами.*
