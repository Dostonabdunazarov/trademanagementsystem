# Разработка и деплой

## Требования

- **.NET 10 SDK** (бэкенд, `net10.0`)
- **Node.js** (фронтенд, Vite 8)
- **PostgreSQL** (или Docker для локальной БД)

## Локальный запуск

### Бэкенд

```bash
cd TradeMS
dotnet run --project TradeMS.Api
```

- Слушает порт из `PORT` (по умолчанию **8080**).
- При старте **применяет миграции** и сидит администратора (см. ниже).
- Строка подключения — `ConnectionStrings:DefaultConnection`. В `appsettings.json` пустая, задаётся через окружение (или `DATABASE_URL`, см. [Переменные окружения](#переменные-окружения)).
- Swagger/OpenAPI (`MapOpenApi`) доступен только в Development.

### Фронтенд

```bash
cd trade-ms-ui
npm install
npm run dev          # Vite dev-сервер (по умолчанию http://localhost:5173)
```

Задайте адрес API в `trade-ms-ui/.env.local`:

```
VITE_API_URL=http://localhost:5000/api
```

## npm-скрипты (фронтенд)

| Скрипт | Действие |
|---|---|
| `npm run dev` | Vite dev-сервер |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | предпросмотр сборки |
| `npm run lint` | ESLint |
| `npm test` | Vitest (однократный прогон) |
| `npm run test:watch` | Vitest в watch-режиме |
| `npm run test:coverage` | Vitest с покрытием |

## Тесты

- **Бэкенд:** `TradeMS.IntegrationTests` — интеграционные тесты на `WebApplicationFactory` (`TradeApiFactory`, `IntegrationTestBase`, `SeededIntegrationTestBase`). Запуск: `dotnet test` из `TradeMS/`.
- **Фронтенд:** Vitest + Testing Library, API мокируется через **MSW** ([`src/test/msw/`](../trade-ms-ui/src/test/msw)). Настройка — [`src/test/setup.ts`](../trade-ms-ui/src/test/setup.ts), конфиг — `vitest.config.ts` (`jsdom`).

## Переменные окружения

Для локального Docker-запуска — файл `.env` в корне (пример значений):

| Переменная | Назначение |
|---|---|
| `POSTGRES_PASSWORD` | пароль PostgreSQL |
| `JWT_SECRET` | секрет для подписи JWT (**≥ 32 символов**, иначе API падает на старте) |
| `ADMIN_EMAIL` | email сидируемого администратора |
| `ADMIN_PASSWORD` | пароль администратора |
| `FRONTEND_ORIGIN` | разрешённый CORS-origin (прод: `https://savdo.hypex.site`) |

Маппинг в контейнер API (`docker-compose.yml`): строка подключения `ConnectionStrings__DefaultConnection`, `Jwt__Secret`/`Jwt__Issuer`/`Jwt__Audience`/`Jwt__ExpiryMinutes`, `Cors__AllowedOrigins__0`, `Seed__AdminEmail`/`Seed__AdminPassword`.

Дополнительно API понимает:
- **`DATABASE_URL`** (формат `postgres://user:pass@host:port/db`) — если задан, парсится в строку подключения Npgsql (удобно для облачных провайдеров).
- **`PORT`** — порт прослушивания.

## Сидинг администратора

При старте [`Program.cs`](../TradeMS/TradeMS.Api/Program.cs) после миграций создаёт компанию `TradeMS` и пользователя-администратора из `Seed:AdminEmail` (по умолчанию `admin@tradems.com`) и `Seed:AdminPassword` (**обязателен** — иначе исключение). Пароль хэшируется BCrypt. Сидинг срабатывает, только если пользователя с таким email ещё нет.

## Docker Compose

```bash
docker compose up -d --build
```

Три сервиса (`docker-compose.yml`):

- **`db`** — `postgres:17-alpine`, БД `tradems`, порт наружу `127.0.0.1:5433` (для локального доступа к БД), volume `postgres_data`.
- **`tradems-api`** — сборка из `TradeMS/TradeMS.Api/Dockerfile`, слушает `:8080`, стартует после healthcheck БД.
- **`tradems-ui`** — сборка из `trade-ms-ui/Dockerfile` с build-arg `VITE_API_URL=/api`. **Порт 80 наружу не публикуется** — им владеет внешний Caddy: он проксирует `savdo.hypex.site → tradems-ui:80` по внешней docker-сети `proxy`.

`docker-compose.override.yml` — локальные переопределения.

## CI/CD

Деплой — [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). На push в `main` (или вручную через `workflow_dispatch`) GitHub Actions по SSH заходит на сервер и:

```bash
cd /root/trademanagementsystem
git fetch origin main
git reset --hard origin/main
docker compose up -d --build
docker image prune -f
```

Конкурентность ограничена группой `deploy-production` (`cancel-in-progress: false`) — деплои не накладываются друг на друга. Секреты: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.
