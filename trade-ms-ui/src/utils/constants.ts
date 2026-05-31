export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

export const TOKEN_STORAGE_KEY = 'auth-storage'

export const DOCUMENT_TYPES = {
  Expense: 'Расход',
  Income: 'Приход',
  ReturnFromCustomer: 'Возврат от клиента',
  ReturnToSupplier: 'Возврат поставщику',
  PayOut: 'Оплата',
  PayIn: 'Получить',
} as const
