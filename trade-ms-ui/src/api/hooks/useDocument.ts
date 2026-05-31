import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '../documents'

export interface DocumentLineDto {
  id: number
  productId: string
  productName: string
  unit: string
  quantity: number
  price: number
  discountPercent: number
  total: number
}

export interface DocumentDto {
  id: number
  type: string
  number: string
  date: string
  status: string
  counterpartyId: string | null
  counterpartyName: string | null
  currencyId: string
  currencyCode: string
  exchangeRate: number
  discountPercent: number
  note: string | null
  totalAmount: number
  totalAmountBase: number
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
