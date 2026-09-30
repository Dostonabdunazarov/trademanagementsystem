---
paths:
  - "docker-compose*.yml"
  - "**/Dockerfile"
  - "trade-ms-ui/nginx.conf"
  - ".github/workflows/**"
  - "TradeMS/TradeMS.Api/appsettings*.json"
  - "TradeMS/TradeMS.Api/Program.cs"
---

# Инфраструктура и деплой

- **Прод:** сервер с `/root/trademanagementsystem`, внешний Caddy (конфиг в соседнем репозитории `corpdev/infra`) проксирует `savdo.hypex.site → tradems-ui:80` по docker-сети `proxy`. nginx в `tradems-ui` проксирует `/api` → `tradems-api:8080`.
- **Деплой:** любой push в `main` → `git reset --hard origin/main && docker compose up -d --build` на сервере. Изменения в compose, Dockerfile и workflow ломают прод сразу, поэтому проверять особенно тщательно.
- **Секреты** только через переменные окружения из `.env` на сервере: `POSTGRES_PASSWORD`, `JWT_SECRET` (≥32), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_ORIGIN`. В `appsettings*.json` и compose не хардкодить. Новая переменная → описать в `docs/development.md` и предупредить пользователя, что её нужно добавить на сервер **до** деплоя.
- Порт БД публикуется только на `127.0.0.1`. Порты API и UI наружу не открывать: вход только через Caddy.
- Сохранять `security_opt: no-new-privileges:true` у всех сервисов.
- В `nginx.conf`: `index.html` без кэша, `/assets` immutable. Security-заголовки добавлять с `always` и повторять в `location`, где есть свой `add_header`.
- GitHub Actions: сторонние actions закреплять по SHA.
