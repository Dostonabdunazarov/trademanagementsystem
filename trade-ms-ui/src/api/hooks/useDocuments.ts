import { useQuery } from '@tanstack/react-query'
import { documentsApi, type DocumentsQuery } from '../documents'

/** DocumentSummaryDto на бэкенде (элемент списка). */
export interface DocumentListItem {
  id: number
  type: string
  number: string
  date: string
  counterpartyId: string | null
  counterpartyName: string | null
  currencyCode: string
  totalAmount: number
  totalAmountBase: number
  discountAmount: number
  status: string
  createdAt: string
}

export interface DocumentsPage {
  items: DocumentListItem[]
  totalCount: number
  page: number
  pageSize: number
}

export type UseDocumentsParams = DocumentsQuery

export function useDocuments(params: UseDocumentsParams = {}) {
  return useQuery<DocumentsPage>({
    queryKey: ['documents', params],
    queryFn: () => documentsApi.getAll(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
