import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '../documents'

/** DocumentLineDto на бэкенде. */
export interface DocumentLineDto {
  id: number
  productId: string
  productName: string
  quantity: number
  unit: string
  price: number
  discountPercent: number
  discountPrice: number
  total: number
}

/** DocumentDto на бэкенде. */
export interface DocumentDto {
  id: number
  companyId: string
  branchId: string
  type: string
  number: string
  date: string
  counterpartyId: string | null
  counterpartyName: string | null
  currencyId: string
  currencyCode: string
  exchangeRate: number
  totalAmount: number
  totalAmountBase: number
  discountPercent: number
  discountAmount: number
  note: string | null
  amount: number | null
  paymentMethod: string | null
  accountId: string | null
  accountName: string | null
  status: string
  createdBy: string
  createdAt: string
  confirmedAt: string | null
  lines: DocumentLineDto[]
}

export function useDocument(id: number | null) {
  return useQuery<DocumentDto>({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getById(id!),
    enabled: id != null,
    staleTime: 30_000,
  })
}
