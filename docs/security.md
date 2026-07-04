# Роли и безопасность

## Аутентификация (JWT)

Настройка — [`Infrastructure/DependencyInjection.cs`](../TradeMS/TradeMS.Infrastructure/DependencyInjection.cs), генерация токенов — [`Services/JwtService.cs`](../TradeMS/TradeMS.Infrastructure/Services/JwtService.cs).

- **Схема:** JWT Bearer, алгоритм ограничен `HmacSha256`.
- **Валидация:** проверяются issuer, audience, время жизни и подпись; `ClockSkew = 30 сек`.
- **Секрет** (`Jwt:Secret`) должен быть **≥ 32 символов**, иначе приложение падает на старте. Задаётся через переменную `Jwt__Secret`.
- **Access-токен** живёт `Jwt:ExpiryMinutes` (по умолчанию **60 минут**) и несёт claims:

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

**По компании:** каждый эндпоинт читает `company_id` из JWT (локальный хелпер `GetCompanyId(ClaimsPrincipal)`) и передаёт в MediatR-запрос; обработчики фильтруют `.Where(x => x.CompanyId == request.CompanyId)`.

**По филиалу** — зависит от роли:

- **Документы** ([`DocumentEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/DocumentEndpoints.cs)): не-админ жёстко ограничен своим `branch_id` из токена; админ может передавать `branchId` (список) / `BranchId` (создание) свободно. При создании: не-админ без филиала → `400`; админ без `BranchId` → `400`.
- **Кассы** ([`AccountEndpoints.cs`](../TradeMS/TradeMS.Api/Endpoints/AccountEndpoints.cs)): та же схема — админ берёт `BranchId` из тела (с откатом на филиал из токена), не-админ — филиал из токена или `400`.
- **Отчёты** принимают опциональный `branchId` как есть (без принудительного ограничения на уровне эндпоинта).
- **Валюты и курсы** — глобальные, без скоупинга.

> Исторический контекст: правки в скоупинге касс/документов связаны с кейсом «админ без филиала» (см. историю коммитов ветки). Именно поэтому админ передаёт филиал в теле/параметрах, а не берёт из токена.

## Защита входа

Логика в `LoginCommandHandler` ([`Features/Auth/Commands/Login`](../TradeMS/TradeMS.Application/Features/Auth/Commands/Login)):

- Пароли проверяются через **BCrypt**.
- **5** неудачных попыток → блокировка на **15 минут** (`LockoutUntil`).
- Неактивные (`IsActive = false`) и удалённые аккаунты отклоняются.
- Все попытки входа и ключевые действия пишутся в `audit_logs` через `IAuditLogger` (константы — [`AuditActions.cs`](../TradeMS/TradeMS.Domain/Entities/AuditActions.cs)).

## CORS

Настраивается в [`Program.cs`](../TradeMS/TradeMS.Api/Program.cs) из `Cors:AllowedOrigins`:

- Заданы origin'ы → разрешены только они (любые методы/заголовки).
- В Development без заданных origin'ов → `AllowAnyOrigin`.
- В прочих окружениях без origin'ов → кросс-доменные запросы отклоняются.

Прод-origin (`FRONTEND_ORIGIN`) — `https://savdo.hypex.site`.
