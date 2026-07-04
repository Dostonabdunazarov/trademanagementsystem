export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

export const TOKEN_STORAGE_KEY = 'auth-storage'

export const DOCUMENT_TYPES = {
  Expense: 'Продажа',
  Income: 'Закупка',
  ReturnFromCustomer: 'Возврат от клиента',
  ReturnToSupplier: 'Возврат поставщику',
  PayOut: 'Выплата',
  PayIn: 'Приём оплаты',
} as const
