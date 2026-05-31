import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '../documents'

export interface DocumentListItem {
  id: number
  type: string
  number: string
  date: string
  counterpartyId: string | null
  counterpartyName: string | null
  currencyId: string
  currencyCode: string
  totalAmount: number
  totalAmountBase: number
  discountAmount: number
  status: string
  createdAt: string
  createdByName: string | null
}

export interface DocumentsPage {
  items: DocumentListItem[]
  totalCount: number
  page: number
  pageSize: number
}

export interface UseDocumentsParams {
  type?: string
  dateFrom?: string
  dateTo?: string
  counterpartyId?: string
  status?: string
  branchId?: string
  page?: number
  pageSize?: number
}

export function useDocuments(params: UseDocumentsParams = {}) {
  return useQuery<DocumentsPage>({
    queryKey: ['documents', params],
    queryFn: () => documentsApi.getAll(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
