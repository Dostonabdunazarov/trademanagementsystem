# Фронтенд

SPA на **React 19 + TypeScript + Vite** в каталоге [`trade-ms-ui/`](../trade-ms-ui). Алиас `@` → `src/` (в `vite.config.ts` и `vitest.config.ts`). Интерфейс — на русском и узбекском.

## Технологии

| Назначение | Библиотека |
|---|---|
| UI | React 19, react-dom |
| Сборка | Vite 8, `@vitejs/plugin-react` |
| Роутинг | react-router-dom v7 |
| Серверное состояние | TanStack Query v5 |
| Клиентское состояние | Zustand v5 (+ `persist`) |
| Формы | react-hook-form + Zod (`@hookform/resolvers`) |
| HTTP | Axios |
| Стили | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first) |
| Компоненты | Radix UI (dialog, label, select, slot), shadcn-стиль |
| Иконки / тосты | lucide-react / sonner |
| i18n | i18next + react-i18next + language-detector |
| Тесты | Vitest + Testing Library + MSW |

## Структура

```
src/
├── api/            # Axios-инстанс, request-модули, TanStack Query хуки
│   └── hooks/      # useProducts, useDocuments, useReports, ...
├── components/     # ui/ (кнопки, инпуты, таблица, диалоги), dashboard/ (виджеты)
├── features/       # экраны по областям (см. ниже)
├── i18n/           # инициализация + локали ru.ts / uz.ts
├── layouts/        # MainLayout (Sidebar + Topbar)
├── lib/            # queryClient, utils
├── store/          # Zustand: auth.store, ui.store
├── test/           # setup, MSW-хендлеры, тесты компонентов
├── utils/          # constants (API_URL и пр.)
├── router.tsx      # маршруты
└── main.tsx        # BrowserRouter + QueryClientProvider
```

### Feature-каталоги (`src/features/`)

- **`auth/`** — `LoginPage`.
- **`dashboard/`** — `DashboardPage`, собирает виджеты из `components/dashboard/` (MetricCard, RevenueChart, TopProductsTable, CounterpartyBalanceWidget, StockAlertBanner, ActivityFeed, QuickActionBar, PeriodFilter); данные через `useReports`.
- **`documents/`** — крупнейшая область. Общие блоки: `DocumentForm`, `DocumentsListPage`, `PaymentForm`, `QuantityDialog`, хук `useDocumentForm`. В `pages/` — 12 страниц: 6 форм создания/редактирования + 6 списков (Expense, Income, ReturnCustomer, ReturnSupplier, PayOut, PayIn).
- **`products/`** — `ProductsPage` (каталог + группы).
- **`counterparties/`** — `CounterpartiesPage`.
- **`reports/`** — `ReportsPage` + `SalesSummaryReport`, `StockBalanceReport`, `CounterpartyBalanceReport`.
- **`settings/`** — `SettingsPage` с вкладками `AccountsTab`, `BranchesTab`, `CurrenciesTab`, `UsersTab`.
- **`help/`** — `HelpPage` (пользовательская справка).
- **`audit/`** — `AuditLogsPage` (только для админа).

## Роутинг ([`router.tsx`](../trade-ms-ui/src/router.tsx))

Два защитных обёрточных компонента:

- **`PrivateRoute`** — редиректит на `/login`, если нет `accessToken`.
- **`AdminRoute`** — на `/login`, если нет пользователя; на `/`, если роль не `Admin`.

Все экраны, кроме `/login`, обёрнуты `PrivateRoute` → `MainLayout`. Формы документов — по единственному пути (`/expense`, `/income`, `/return-customer`, `/return-supplier`, `/pay-out`, `/pay-in`), списки — по множественному (`/expenses`, `/incomes`, …). `/audit-logs` дополнительно защищён `AdminRoute`. Неизвестные пути → редирект на `/`.

## Состояние — Zustand ([`src/store/`](../trade-ms-ui/src/store))

- **`auth.store.ts`** (`useAuthStore`, persist-ключ `auth-storage`) — `user` (id, fullName, email, role, companyId, companyName, branchId), `accessToken`, `refreshToken`. Действия: `login`, `logout`, `setAccessToken`.
- **`ui.store.ts`** (`useUiStore`, persist-ключ `ui-storage`) — `activeBranch`, `sidebarOpen`, `language` (`ru`/`uz`, по умолч. `ru`), `theme` (`dark`/`light`, по умолч. `dark`). Персистятся только `activeBranch`, `language`, `theme`. Тема применяется к DOM до рендера (IIFE `syncTheme`, чтобы не было мигания).

## API-слой ([`src/api/`](../trade-ms-ui/src/api))

- **Axios-инстанс** [`axios.ts`](../trade-ms-ui/src/api/axios.ts): `baseURL = API_URL`.
  - *Request-интерцептор:* добавляет `Authorization: Bearer <accessToken>` из `useAuthStore`.
  - *Response-интерцептор:* на `401` запускает refresh (`POST {API_URL}/auth/refresh`), очередит параллельные запросы на время обновления (флаг `isRefreshing` + `failedQueue`), сохраняет новый токен и повторяет запросы. При провале refresh — `logout()` и редирект на `/login`.
- **Request-модули** — плоские объекты в `src/api/*.ts` (`products.ts`, `documents.ts`, …), каждый метод вызывает `apiClient.<verb>(...).then(r => r.data)`.
- **TanStack Query хуки** — в [`src/api/hooks/`](../trade-ms-ui/src/api/hooks): запросы через `useQuery` со структурированным `queryKey` и `staleTime`; мутации через `useMutation` с `invalidateQueries` в `onSuccess`.
- **QueryClient** [`lib/queryClient.ts`](../trade-ms-ui/src/lib/queryClient.ts): `staleTime: 60_000`, `retry: 1`.

### Базовый URL API

В [`src/utils/constants.ts`](../trade-ms-ui/src/utils/constants.ts):

```ts
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
```

- Локально: задайте `VITE_API_URL` в `trade-ms-ui/.env.local` (напр. `http://localhost:5000/api`), иначе используется дефолт.
- В Docker: значение подставляется build-аргументом `VITE_API_URL: "/api"` (см. `docker-compose.yml`) — фронт ходит на тот же origin через реверс-прокси.

## i18n ([`src/i18n/`](../trade-ms-ui/src/i18n))

- Языки: **`ru`** и **`uz`**, `fallbackLng: 'ru'`.
- Ключи — в [`locales/ru.ts`](../trade-ms-ui/src/i18n/locales/ru.ts) и [`locales/uz.ts`](../trade-ms-ui/src/i18n/locales/uz.ts), вложенные пространства имён (`common.save` и т.п.). Файлы держатся в параллельной структуре.
- Определение языка — из localStorage (ключ `language`); `useUiStore.setLanguage` синхронизирует его с `i18n.changeLanguage`.

## Темизация

Тёмная тема по умолчанию, светлая — опционально. Реализация — класс на `<html>` + HSL CSS-переменные в [`src/index.css`](../trade-ms-ui/src/index.css):

- `@theme inline` маппит токены Tailwind на HSL-переменные;
- `:root` задаёт тёмную палитру, `html.light` переопределяет под светлую;
- переключение — `toggleTheme` в `ui.store.ts` (тоглит класс `light`, задаёт фон body).

Акцентный цвет — indigo `#6366f1`.

## Навигационное меню

Пункты сайдбара задаются массивом `NAV_SECTIONS` в [`MainLayout.tsx`](../trade-ms-ui/src/layouts/MainLayout.tsx), разбиты на секции: «Операции», «Справочники», «Аналитика», «Система». Пункт «Аудит» показывается только роли `Admin`. Локализованные подписи — через ключи `nav.*`.
