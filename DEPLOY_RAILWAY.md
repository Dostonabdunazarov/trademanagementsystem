# Деплой TradeMS в Railway

Railway деплоит три сервиса по отдельности: **PostgreSQL** (managed), **API** (ASP.NET), **UI** (React/Nginx).

---

## Что нужно исправить в коде перед деплоем

Railway передаёт порт через переменную `PORT`, а не через `ASPNETCORE_URLS`. Нужно внести два изменения.

### 1. `TradeMS/TradeMS.Api/Program.cs`

Добавь строку `builder.WebHost.UseUrls(...)` сразу после `var builder = ...`:

```csharp
var builder = WebApplication.CreateBuilder(args);

// --- добавить эту строку ---
builder.WebHost.UseUrls($"http://+:{Environment.GetEnvironmentVariable("PORT") ?? "8080"}");
// --------------------------
```

### 2. `trade-ms-ui/nginx.conf`

В Railway UI и API — разные сервисы с разными доменами. Nginx не может проксировать к `http://api:8080` — это имя работает только в docker-compose.

Замени весь файл на следующее (убираем proxy_pass, фронт будет обращаться к API напрямую через `VITE_API_URL`):

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> Вместо проксирования через Nginx, фронт будет напрямую ходить на Railway-домен API (задаётся через `VITE_API_URL` при сборке).

### 3. `trade-ms-ui/Dockerfile`

Строку 8 изменить — `VITE_API_URL` теперь передаётся как build arg:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
RUN VITE_API_URL=$VITE_API_URL npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## Пошаговый деплой

### Шаг 1. Создать аккаунт и проект

1. Зайти на [railway.app](https://railway.app) → Sign Up (через GitHub).
2. Нажать **New Project**.

---

### Шаг 2. Добавить PostgreSQL

1. В проекте нажать **+ Add Service → Database → PostgreSQL**.
2. Railway создаст базу и автоматически добавит переменную `DATABASE_URL` вида:
   ```
   postgresql://postgres:pass@host.railway.internal:5432/railway
   ```
3. Нажать на сервис PostgreSQL → вкладка **Variables** → скопировать значение `DATABASE_URL`.

---

### Шаг 3. Задеплоить API (ASP.NET)

1. В проекте нажать **+ Add Service → GitHub Repo**.
2. Выбрать репозиторий `trademanagementsystem`.
3. В настройках сервиса → **Settings**:
   - **Root Directory**: `TradeMS`
   - **Build Command**: *(оставить пустым, Railway найдёт Dockerfile)*
   - **Dockerfile Path**: `TradeMS.Api/Dockerfile`
4. Вкладка **Variables** — добавить следующие переменные:

| Переменная | Значение |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | *(вставить DATABASE_URL из шага 2, но в формате Npgsql — см. ниже)* |
| `Jwt__Secret` | *(сгенерировать: минимум 32 символа, например через `openssl rand -base64 32`)* |
| `Jwt__Issuer` | `TradeMS` |
| `Jwt__Audience` | `TradeMS` |
| `Jwt__ExpiryMinutes` | `60` |

**Конвертация DATABASE_URL в Npgsql формат:**

Railway даёт: `postgresql://user:pass@host:5432/dbname`

Нужно преобразовать в: `Host=host;Port=5432;Database=dbname;Username=user;Password=pass`

Либо добавить в `Program.cs` парсинг DATABASE_URL (см. раздел "Советы" ниже).

5. **Generate Domain** — нажать в Settings → Networking → **Generate Domain**.  
   Получишь URL вида `api-production-xxxx.up.railway.app` — он понадобится для UI.

---

### Шаг 4. Задеплоить UI (React)

1. В проекте нажать **+ Add Service → GitHub Repo** (тот же репозиторий).
2. В настройках сервиса → **Settings**:
   - **Root Directory**: `trade-ms-ui`
   - **Dockerfile Path**: `Dockerfile`
3. Вкладка **Variables** — добавить:

| Переменная | Значение |
|---|---|
| `VITE_API_URL` | `https://api-production-xxxx.up.railway.app/api` *(домен из шага 3)* |

> Это build-time переменная — она вшивается в бандл при сборке. После её изменения нужен редеплой.

4. **Generate Domain** для UI → получишь публичный URL приложения.

---

### Шаг 5. Проверить деплой

1. API health check: открыть `https://<api-domain>/health` — должно вернуть `Healthy`.
2. UI: открыть `https://<ui-domain>` — должна загрузиться страница логина.
3. Войти в приложение и проверить работу.

---

## Советы

### Парсинг DATABASE_URL в ASP.NET (опционально, упрощает конфигурацию)

Добавь в `Program.cs` перед `builder.Services.AddInfrastructure(...)`:

```csharp
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var npgsqlConn = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]}";
    builder.Configuration["ConnectionStrings:DefaultConnection"] = npgsqlConn;
}
```

Тогда в Railway Variables достаточно оставить только `DATABASE_URL` (Railway подставляет его автоматически при линковке с PostgreSQL сервисом).

### Линковка PostgreSQL с API сервисом

В Railway можно слинковать сервисы — тогда `DATABASE_URL` автоматически появится в переменных API:
1. Зайти в сервис API → **Variables**.
2. Нажать **+ Add Reference** → выбрать PostgreSQL → выбрать `DATABASE_URL`.

### Генерация JWT Secret

```bash
openssl rand -base64 32
```

Или онлайн: [generate.plus/en/base64](https://generate.plus/en/base64) (длина 32+).

### Редеплой после изменений

Railway автоматически деплоит при каждом push в GitHub ветку, к которой привязан сервис. Ветка по умолчанию — `main`.

---

## Структура переменных окружения (итог)

### API сервис

```
ASPNETCORE_ENVIRONMENT=Production
DATABASE_URL=<авто, если слинковано>  ИЛИ  ConnectionStrings__DefaultConnection=Host=...
Jwt__Secret=<32+ символов>
Jwt__Issuer=TradeMS
Jwt__Audience=TradeMS
Jwt__ExpiryMinutes=60
```

### UI сервис

```
VITE_API_URL=https://<api-railway-domain>/api
```

---

## Возможные ошибки

| Ошибка | Причина | Решение |
|---|---|---|
| API не стартует, порт не слушает | `PORT` env var не прочитан | Добавить `builder.WebHost.UseUrls(...)` в Program.cs |
| `connection refused` к БД | Неверная connection string | Проверить формат Npgsql, убедиться что DB сервис запущен |
| UI показывает ошибку сети | `VITE_API_URL` не задан или неверный | Проверить переменную, сделать редеплой UI |
| Миграции не прошли | DB ещё не готова при старте | Railway health checks должны дать БД стартовать первой; или добавить retry в Program.cs |
| CORS ошибка в браузере | Домен UI не разрешён | Временно `AllowAnyOrigin()` уже стоит — проблем быть не должно |
