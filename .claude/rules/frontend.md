---
paths:
  - "trade-ms-ui/src/**/*.ts"
  - "trade-ms-ui/src/**/*.tsx"
---

# Фронтенд (trade-ms-ui)

## Данные
- HTTP только через `apiClient` из `src/api/axios.ts`. Функции — в `src/api/<область>.ts`, хуки — в `src/api/hooks/`.
- **TS-типы = DTO бэкенда** (`TradeMS/TradeMS.Application/Features/**/DTOs/*.cs`). При добавлении поля в DTO добавить его в тип. Отсутствующее в типе поле, которое потом уходит в PUT, затирает данные (AUDIT FE-5, `address`).
- Запросы с зависимостью от филиала включают `activeBranch?.id` в `queryKey`.
- Мутации инвалидируют все зависимые ключи. Проведение, отмена и удаление документа: `documents`, `document`, `reports`, `products`, `counterparties`, `accounts`.
- Форма, открытая по `?id=` для существующего черновика, **обновляет или проводит этот документ**, а не создаёт новый (AUDIT FE-4).

## Ошибки и UX
- `catch (err) { toast.error(getApiErrorMessage(err, t)) }`. Пустой `catch {}` запрещён.
- Опасные действия (удаление, отмена документа) — только с диалогом подтверждения.
- Админские кнопки скрываются через `useAuthStore(s => s.user?.role === 'Admin')`. Сервер всё равно проверяет права.
- Горячие клавиши не перехватывать при фокусе в `input/textarea/select`, при зажатых модификаторах и для F5.

## i18n
- Любой видимый текст, `aria-label` и `placeholder` — через `t()`. Ключ добавляется одновременно в `src/i18n/locales/ru.ts` и `uz.ts`.
- Коды серверных ошибок — `errors.codes.<code>`, совпадают с `BusinessException.Code` и `WithErrorCode` на бэкенде.

## Даты и числа
- «Сегодня»: `format(new Date(), 'yyyy-MM-dd')` из date-fns. **Не** `new Date().toISOString().slice(0,10)`.
- Строку `yyyy-MM-dd` не парсить через `new Date(str)`: получится UTC-полночь. Использовать `parseISO` из date-fns.
- Суммы форматировать через `src/utils/format.ts`. Итоговые суммы и курс при проведении считает сервер. UI показывает предварительный расчёт и не должен расходиться с сервером по формуле округления.

## Auth
- Токены лежат в `auth.store` (zustand persist). При refresh сохранять **оба** токена из ответа. При logout: `POST /auth/logout` → `queryClient.clear()` → очистить `activeBranch` → `logout()`.
- Интерцептор 401 не должен обрабатывать `/auth/*`.

## Стиль и тесты
- Цвета — только токены из `src/index.css`, без хардкода hex в компонентах. Перед сменой палитры отрендерить варианты на превью.
- Компоненты — shadcn/ui из `src/components/ui`. Иконки — `lucide-react`. Кнопка из одной иконки обязательно с `aria-label`.
- Тест на новую страницу или поведение: `src/test/components/<область>/*.test.tsx`, рендер через `renderWithProviders`, API мокается в `src/test/msw/handlers`. Для админских кнопок задать пользователю роль Admin в сторе.
