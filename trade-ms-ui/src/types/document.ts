export type DocumentType =
  | 'Expense'
  | 'Income'
  | 'ReturnFromCustomer'
  | 'ReturnToSupplier'
  | 'PayOut'
  | 'PayIn'

export interface DocumentLine {
  id: string
  productId: string
  productName: string
  unit: string
  quantity: number
  price: number
  discountPercent: number
  total: number
}

export interface DocumentFormState {
  type: DocumentType
  date: string
  counterpartyId: string
  counterpartyName: string
  currencyId: string
  currencyCode: string
  exchangeRate: number
  note: string
  lines: DocumentLine[]
  discountPercent: number
}

export type PaymentMethod = 'Cash' | 'BankTransfer' | 'Card'

export interface PaymentFormState {
  type: DocumentType
  date: string
  counterpartyId: string
  counterpartyName: string
  amount: number
  currencyId: string
  currencyCode: string
  exchangeRate: number
  paymentMethod: PaymentMethod
  accountId: string
  note: string
}
