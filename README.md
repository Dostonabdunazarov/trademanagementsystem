# Trade Management System (TradeMS)

Корпоративная система управления торговлей — .NET 10 (Clean Architecture) + React + PostgreSQL.

**Статус:** В активной разработке. Бэкенд завершён полностью, фронтенд завершён.

---

## 📚 Документация

Подробная техническая документация — в каталоге [`docs/`](docs/README.md):

| Раздел | О чём |
|---|---|
| [Архитектура](docs/architecture.md) | Слои Clean Architecture, поток запроса, CQRS/MediatR |
| [API](docs/api.md) | Полный список эндпоинтов, авторизация, параметры |
| [База данных](docs/database.md) | Сущности, схема, индексы, оптимистичная блокировка, миграции |
| [Роли и безопасность](docs/security.md) | JWT, роли, мультитенантность, филиалы, аудит |
| [Бизнес-логика документов](docs/documents.md) | Статусы, движение склада и балансов при проведении |
| [Фронтенд](docs/frontend.md) | Структура React-приложения, роутинг, стор, API-слой, i18n |
| [Разработка и деплой](docs/development.md) | Локальный запуск, окружение, тесты, Docker, CI/CD |

---

## Стек технологий

| Слой | Технологии |
|---|---|
| Бэкенд | ASP.NET Core 10 Minimal API, EF Core + Npgsql, MediatR, FluentValidation, AutoMapper, BCrypt.Net, JwtBearer, Serilog |
| Фронтенд | React 19 + TypeScript, Vite, TanStack Query, Zustand, React Router v7, Tailwind CSS v4, shadcn/ui, React Hook Form + Zod, Axios |
| База данных | PostgreSQL 16 |
| Инфраструктура | Docker Compose, Nginx (reverse proxy) |
| Деплой | Railway |

---

## Структура проекта

```
TradeManagementSystem/
├── TradeMS/
│   ├── TradeMS.Domain/           # Сущности, перечисления, интерфейсы
│   ├── TradeMS.Application/      # CQRS (MediatR), DTO, валидация
│   ├── TradeMS.Infrastructure/   # EF Core, JWT, PostgreSQL, репозитории
│   ├── TradeMS.Api/              # Minimal API эндпоинты, Swagger
│   └── TradeMS.IntegrationTests/ # Интеграционные тесты
├── trade-ms-ui/
│   └── src/
│       ├── api/             # Axios + TanStack Query хуки
│       ├── components/      # Общие: Table, Modal, Input, Badge, Combobox
│       ├── features/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── documents/
│       │   ├── products/
│       │   ├── counterparties/
│       │   ├── reports/
│       │   └── settings/
│       ├── layouts/         # MainLayout (Sidebar + Topbar), AuthLayout
│       └── store/           # Zustand: auth, активный филиал
├── docker-compose.yml
└── .env.example
```

---

## Схема базы данных

### Тенант и пользователи

```sql
Companies (id, name, tax_code, address, created_at)
Branches  (id, company_id → Companies, name, address)
Users     (id, company_id, branch_id, full_name, email, password_hash,
           role VARCHAR(20),   -- Admin | Manager | Cashier
           is_active, created_at)
```

### Контрагенты

```sql
Counterparties (id, company_id, type VARCHAR(20), -- Customer | Supplier | Both
                name, phone, address, credit_limit, created_at)
```

### Валюты

```sql
Currencies    (id, code, name, is_base)
ExchangeRates (id, from_currency_id, to_currency_id, rate, date,
               UNIQUE(from_currency_id, to_currency_id, date))
```

### Товары и склад

```sql
ProductGroups (id, company_id, name, parent_id → ProductGroups)  -- дерево
Products      (id, company_id, group_id, name, sku, barcode,
               unit, price_sell, price_buy, currency_id, is_active)
Stock         (id, product_id, branch_id, quantity,
               UNIQUE(product_id, branch_id))
```

### Документы

```sql
Documents     (id BIGSERIAL, company_id, branch_id,
               type VARCHAR(30),  -- Expense | Income | ReturnFromCustomer |
                                  --   ReturnToSupplier | PayOut | PayIn
               number, date, counterparty_id, currency_id, exchange_rate,
               total_amount, total_amount_base,
               discount_percent, discount_amount, note,
               status VARCHAR(20),  -- Draft | Confirmed | Cancelled
               created_by, created_at, confirmed_at)

DocumentLines (id, document_id, product_id, quantity, price,
               discount_percent, discount_price, total)

Payments      (id, document_id, counterparty_id, amount, currency_id,
               exchange_rate, amount_base, payment_method, account_id)
```

### Кассы и счета

```sql
Accounts (id, company_id, branch_id, name,
          type VARCHAR(20),  -- Cash | Bank
          currency_id, balance)
```

---

## Логика движения склада и баланса

| Тип документа | Склад | Баланс контрагента |
|---|---|---|
| Expense (Расход) | уменьшается | Долг клиента растёт |
| Income (Приход) | растёт | Долг поставщику растёт |
| ReturnFromCustomer | растёт | Долг клиента уменьшается |
| ReturnToSupplier | уменьшается | Долг поставщику уменьшается |
| PayIn (Приём оплаты от клиента) | — | Долг клиента уменьшается; касса + |
| PayOut (Выплата поставщику) | — | Долг поставщику уменьшается; касса − |

> Обновление склада и баланса происходит при **подтверждении** документа (статус → Confirmed), в одной транзакции БД.

---

## API эндпоинты

```
POST   /auth/login
POST   /auth/refresh

GET    /products?search=&groupId=&page=
POST   /products
PUT    /products/{id}
DELETE /products/{id}

GET    /product-groups
POST   /product-groups

GET    /counterparties?type=Customer|Supplier&search=
POST   /counterparties
PUT    /counterparties/{id}
DELETE /counterparties/{id}

GET    /documents?type=&dateFrom=&dateTo=&page=
POST   /documents
PUT    /documents/{id}
POST   /documents/{id}/confirm
DELETE /documents/{id}

GET    /reports/sales-summary?dateFrom=&dateTo=
GET    /reports/stock-balance?branchId=
GET    /reports/counterparty-balance?type=

GET    /currencies
GET    /exchange-rates?date=
POST   /exchange-rates

GET    /accounts
POST   /accounts
GET    /branches
POST   /branches

GET    /health
```

---

## UI — дизайн

**Стиль:** Dark mode Glassmorphism + Premium SaaS (корпоративный уровень)

**Палитра:**
```
Background:   #0A0A0F
Surface:      #111118
Accent:       #6366F1  (indigo-500)
Success:      #10B981
Warning:      #F59E0B
Danger:       #EF4444
Text-primary: #F1F5F9
Text-muted:   #64748B
```

**Dashboard виджеты:** MetricCard, RevenueChart, TopProductsTable, CounterpartyBalanceWidget, StockAlertBanner, ActivityFeed, QuickActionBar (F1–F6), BranchSelector, CurrencyRateTicker, DashboardShell

**Форма документа — split panel:**
- Левая панель: дерево групп товаров → таблица товаров группы
- Правая панель: строки документа
- Горячие клавиши F1–F6 для переключения типов операций

---

## Запуск

### Docker (prod)

```bash
cp .env.example .env    # заполнить DB_PASSWORD и JWT_SECRET
docker compose up -d
# UI:  http://localhost
# API: http://localhost:5000
```

### Локальная разработка

```bash
# Бэкенд
cd TradeMS
dotnet run --project TradeMS.Api

# Фронтенд
cd trade-ms-ui
npm install
npm run dev
```

### Переменные окружения (.env)

```
DB_PASSWORD=...
JWT_SECRET=...
JWT_ISSUER=TradeMS
JWT_AUDIENCE=TradeMS
```

---

## Деплой (Railway)

Проект настроен для деплоя на [Railway](https://railway.app). Конфигурация в `TradeMS/TradeMS.Api/`.
API автоматически выполняет `db.Database.MigrateAsync()` при старте.

---

## Прогресс реализации

### Бэкенд — завершён
- [x] Solution + EF Core миграции (все таблицы)
- [x] JWT аутентификация (login / refresh)
- [x] CRUD: Товары + Группы товаров
- [x] CRUD: Контрагенты
- [x] Документы: создание, редактирование, подтверждение (склад + баланс)
- [x] PayOut / PayIn с обновлением баланса счёта
- [x] Валюты + курсы обмена
- [x] Отчёты: продажи, склад, балансы контрагентов
- [x] Кассы и банковские счета
- [x] Мультитенантность (Companies + Branches)
- [x] Кэширование отчётов (инвалидация при подтверждении)
- [x] Health check эндпоинт
- [x] Railway deployment конфигурация

### Фронтенд — завершён
- [x] Scaffold: Vite + Tailwind + Router + Zustand
- [x] Login страница (dark mode, Premium SaaS стиль)
- [x] DashboardShell (Sidebar + Topbar + 12-col grid)
- [x] Все 9 Dashboard компонентов (MetricCard, RevenueChart и др.)
- [x] Форма документов (split panel, F1–F6)
- [x] Списки документов с фильтрацией и пагинацией
- [x] Управление товарами и группами
- [x] Управление контрагентами
- [x] Отчёты
- [x] Настройки (валюты, кассы, пользователи, филиалы)
