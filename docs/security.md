# Роли и безопасность

## Аутентификация (JWT)

Настройка — [`Infrastructure/DependencyInjection.cs`](../TradeMS/TradeMS.Infrastructure/DependencyInjection.cs), генерация токенов — [`Services/JwtService.cs`](../TradeMS/TradeMS.Infrastructure/Services/JwtService.cs).

- **Схема:** JWT Bearer, алгоритм ограничен `HmacSha256`.
- **Валидация:** проверяются issuer, audience, время жизни и подпись; `ClockSkew = 30 сек`.
- **Секрет** (`Jwt:Secret`) должен быть **≥ 32 символов**, иначе приложение падает на старте. Задаётся через переменную `Jwt__Secret`.
- **Access-токен** живёт `Jwt:ExpiryMinutes` (по умолчанию **15 минут** — смена роли или деактивация вступает в силу не позже этого срока) и несёт claims:

  | Claim | Значение |
  |---|---|
  | `sub` | Id пользователя |
  | `email` | email |
  | `company_id` | Id компании |
  | `branch_id` | Id филиала (пустая строка, если у пользователя нет филиала) |
  | `role` (`ClaimTypes.Role`) | название роли |
  | `jti` | уникальный идентификатор токена |

- **Refresh-токен:** 64 случайных байта (base64). В БД (`users.RefreshToken`) хранится только **SHA-256 хэш**, срок жизни — 7 дней. Обновление — `POST /api/auth/refresh`, отзыв — `POST /api/auth/logout`.

## Роли и политики доступа

Три роли (`UserRole`): **`Admin`**, **`Manager`**, **`Cashier`**.

Механизмы разграничения:

- Одна именованная политика **`"Admin"`** = `RequireRole("Admin")` — используется группой `audit-logs`.
- Большинство пишущих эндпоинтов используют инлайн `.RequireAuthorization(p => p.RequireRole("Admin"))`.
- Остальные группы — `.RequireAuthorization()` (любой аутентифицированный).
- Отдельных политик для `Manager`/`Cashier` **нет** — им доступны не-админские (`Auth`) эндпоинты, а ограничение по филиалу накладывается в коде эндпоинта.

Итого по доступу (детальная таблица — в [API](api.md)):

| Область | Чтение | Запись |
|---|---|---|
| Продукты, группы, контрагенты, кассы, валюты, курсы, филиалы, пользователи | Auth | **Admin** |
| Документы (создание/проведение/отмена/удаление) | Auth | Auth (+ скоуп по филиалу) |
| Отчёты | Auth | — |
| Журнал аудита | **Admin** | — |

## Мультитенантность и филиалы

**Глобального query-фильтра нет** — скоупинг применяется явно в каждом обработчике/эндпоинте.

**По компании:** эндпоинты читают claims через [`ClaimsPrincipalExtensions`](../TradeMS/TradeMS.Api/Infrastructure/ClaimsPrincipalExtensions.cs) (`GetCompanyId`, `GetUserId`, `BranchScope`) и передают `CompanyId` в MediatR-запрос; обработчики фильтруют `.Where(x => x.CompanyId == request.CompanyId)`.

**Внешние id из тела запроса** (`CounterpartyId`, `ProductId`, `AccountId`, `BranchId`, `CurrencyId`) проверяются на принадлежность компании, `DeletedAt == null` и активность — [`DocumentRules.EnsureReferencesAsync`](../TradeMS/TradeMS.Application/Features/Documents/DocumentRules.cs) для документов (при создании, правке и повторно при проведении), `UserRules.EnsureBranchAsync` для пользователей, проверка филиала в `CreateAccount`. Касса платежа должна быть из **филиала документа**.

**По филиалу** — `user.BranchScope(requested)`:

- **Admin** видит всю компанию и может сузить выборку параметром `branchId`. При создании документа/кассы берёт `branchId` из тела, иначе — свой филиал из токена.
- **Manager / Cashier** всегда ограничены `branch_id` из токена — параметр запроса игнорируется. Это касается **и чтения**: список и карточка документа (`GET /documents/{id}` чужого филиала → `404`), все `/reports/*`, `/accounts`.
- Не-админ **без филиала** получает `403` с кодом `branchNotAssigned` (раньше `null` означал «все филиалы»). Создать или перевести Manager/Cashier без филиала нельзя (`branchRequiredForRole`).
- **Валюты и курсы** — глобальные справочники (одна компания на инсталляцию). Меняет их только Admin; сменить базовую валюту после проводок нельзя (`baseCurrencyLocked`). Перед подключением второй компании им нужен `CompanyId` — см. `AUDIT_2026-09-29.md`, BIZ-5.

**Роли на эндпоинтах:** `GET /users` — только Admin; отмена проведённого документа (`POST /documents/{id}/cancel`) — Admin и Manager.

## Пользователи и сессии

- Нельзя менять собственные роль/активность и удалять себя (`cannotModifySelf`).
- Нельзя разжаловать, деактивировать или удалить последнего активного Admin компании (`lastAdmin`).
- Смена роли, активности, филиала или пароля, а также удаление **отзывают refresh-токен**; access-токен истекает сам (15 мин).
- Email хранится и сравнивается в нижнем регистре.

## Защита входа

Логика в `LoginCommandHandler` ([`Features/Auth/Commands/Login`](../TradeMS/TradeMS.Application/Features/Auth/Commands/Login)):

- Пароли проверяются через **BCrypt**.
- **Rate limiting:** все `/api/auth/*` — не больше `RateLimit:AuthPerMinute` (по умолчанию 20) запросов в минуту с одного IP, сверх — `429`. Реальный IP клиента берётся через `UseForwardedHeaders` (доверены только частные сети docker, 2 прокси-хопа: Caddy → nginx), поэтому поддельный `X-Forwarded-For` не помогает.
- **5** неудачных попыток → блокировка на **15 минут** (`LockoutUntil`). Счётчик увеличивается атомарно (`ExecuteUpdate`), параллельные попытки его не обходят.
- Неактивные (`IsActive = false`) и удалённые аккаунты отклоняются.
- Любой отказ (нет пользователя, неактивен, заблокирован, неверный пароль) — одинаковый `401` с кодом `invalidCredentials`; для несуществующего email тоже выполняется BCrypt (нет утечки по времени). Причина видна только в аудите.
- Все попытки входа и ключевые действия пишутся в `audit_logs` через `IAuditLogger` (константы — [`AuditActions.cs`](../TradeMS/TradeMS.Domain/Entities/AuditActions.cs)).

## CORS

Настраивается в [`Program.cs`](../TradeMS/TradeMS.Api/Program.cs) из `Cors:AllowedOrigins`:

- Заданы origin'ы → разрешены только они (любые методы/заголовки).
- В Development без заданных origin'ов → `AllowAnyOrigin`.
- В прочих окружениях без origin'ов → кросс-доменные запросы отклоняются.

Прод-origin (`FRONTEND_ORIGIN`) — `https://savdo.hypex.site`.
