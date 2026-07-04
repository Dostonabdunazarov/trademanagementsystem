# Архитектура

Бэкенд построен по принципам **Clean Architecture** — четыре проекта с однонаправленными зависимостями (внешние слои зависят от внутренних, но не наоборот) плюс проект интеграционных тестов.

```
TradeMS/
├── TradeMS.Domain/            # Сущности и перечисления. Без зависимостей.
├── TradeMS.Application/       # CQRS (MediatR), DTO, валидация, интерфейсы. Зависит от Domain.
├── TradeMS.Infrastructure/    # EF Core, JWT, реализации сервисов. Зависит от Application.
├── TradeMS.Api/               # Minimal API host, эндпоинты. Зависит от Application + Infrastructure.
└── TradeMS.IntegrationTests/  # xUnit + WebApplicationFactory
```

## Слои

### TradeMS.Domain
Только доменные сущности ([`Entities/`](../TradeMS/TradeMS.Domain/Entities)) и перечисления ([`Enums/`](../TradeMS/TradeMS.Domain/Enums)). Никаких зависимостей на другие проекты, EF Core или ASP.NET. Подробности — в [Базе данных](database.md).

### TradeMS.Application
Прикладная логика на **CQRS через MediatR**. Организована по функциональным областям:

```
Features/<Область>/
├── Commands/<Действие>/    # Команда (record) + Handler + опц. Validator
├── Queries/<Запрос>/       # Запрос (record) + Handler
└── DTOs/                   # Request/Response модели
```

- Области: `Auth`, `Branches`, `Products`, `Counterparties`, `Currencies`, `Documents`, `Reports`, `Accounts`, `Users`, `AuditLogs`.
- Общие интерфейсы — в [`Common/Interfaces/`](../TradeMS/TradeMS.Application/Common/Interfaces): `IAppDbContext`, `IJwtService`, `ICurrentUserService`, `IAuditLogger`. Application работает **только через эти интерфейсы**, реализации живут в Infrastructure.
- Валидация — **FluentValidation** через MediatR pipeline behavior [`Common/Behaviors/ValidationBehavior.cs`](../TradeMS/TradeMS.Application/Common/Behaviors/ValidationBehavior.cs): запрос проверяется валидаторами до попадания в обработчик.
- Регистрация DI — [`Application/DependencyInjection.cs`](../TradeMS/TradeMS.Application/DependencyInjection.cs): MediatR, валидаторы FluentValidation, pipeline behavior.

### TradeMS.Infrastructure
Реализации инфраструктурных сервисов:

- [`Persistence/AppDbContext.cs`](../TradeMS/TradeMS.Infrastructure/Persistence/AppDbContext.cs) — EF Core `DbContext`, реализует `IAppDbContext`. Вся конфигурация модели (таблицы, индексы, точность decimal, конвертация enum→string, row-version) в `OnModelCreating`.
- [`Persistence/AppDbContextFactory.cs`](../TradeMS/TradeMS.Infrastructure/Persistence/AppDbContextFactory.cs) — design-time фабрика для `dotnet ef`.
- [`Migrations/`](../TradeMS/TradeMS.Infrastructure/Migrations) — миграции EF Core.
- [`Services/`](../TradeMS/TradeMS.Infrastructure/Services) — `JwtService`, `CurrentUserService`, `AuditLogger`.
- [`DependencyInjection.cs`](../TradeMS/TradeMS.Infrastructure/DependencyInjection.cs) — регистрация `DbContext` + `DbContextFactory`, JWT-аутентификации и политик авторизации.

### TradeMS.Api
Host на **ASP.NET Core Minimal API**:

- [`Program.cs`](../TradeMS/TradeMS.Api/Program.cs) — сборка приложения, миграция + сидинг при старте, CORS, аутентификация, регистрация групп эндпоинтов под префиксом `/api`.
- [`Endpoints/`](../TradeMS/TradeMS.Api/Endpoints) — по одному статическому классу `*Endpoints.cs` на область; каждый маппит маршруты и делегирует в `IMediator`.
- [`Infrastructure/`](../TradeMS/TradeMS.Api/Infrastructure) — `GlobalExceptionHandler` (ProblemDetails) и `DateOnlyJsonConverter`.

## Поток HTTP-запроса

```
HTTP → Minimal API endpoint (*Endpoints.cs)
     → извлечение company_id / branch_id / role из JWT-claims
     → mediator.Send(Command|Query)
     → [ValidationBehavior] FluentValidation
     → Handler (Application) через IAppDbContext
     → EF Core → PostgreSQL
     → Response DTO
```

Эндпоинты **не содержат бизнес-логики** — только чтение claims, скоупинг по компании/филиалу и вызов MediatR. Вся логика — в обработчиках Application-слоя. Подробнее про скоупинг — в [Роли и безопасность](security.md).

## Технологии бэкенда

| Назначение | Библиотека |
|---|---|
| Web | ASP.NET Core 10 Minimal API |
| ORM | EF Core + Npgsql (PostgreSQL) |
| CQRS / медиатор | MediatR |
| Валидация | FluentValidation (pipeline behavior) |
| Аутентификация | JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`) |
| Хэш паролей | BCrypt.Net |
| Сериализация enum | `JsonStringEnumConverter` (enum'ы ходят строками) |

Фронтенд описан отдельно — см. [Фронтенд](frontend.md).
