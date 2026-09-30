import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { documentsApi } from '../documents'
import type { DocumentDto } from './useDocument'

export interface CreateDocumentLinePayload {
  productId: string
  quantity: number
  price: number
  discountPercent: number
}

/** CreateDocumentRequest на бэкенде. */
export interface CreateDocumentPayload {
  type: string
  date: string
  /** Учитывается только для Admin; остальным филиал берётся из токена. */
  branchId?: string | null
  counterpartyId: string | null
  currencyId: string
  exchangeRate: number
  discountPercent: number
  note: string | null
  lines: CreateDocumentLinePayload[]
  amount?: number | null
  paymentMethod?: string | null
  accountId?: string | null
}

/**
 * UpdateDocumentRequest на бэкенде. Для PayIn/PayOut передаются `lines: []`
 * и платёжные поля; для товарных документов платёжные поля игнорируются.
 */
export interface UpdateDocumentPayload {
  date: string
  counterpartyId: string | null
  currencyId: string
  exchangeRate: number
  discountPercent: number
  note: string | null
  lines: CreateDocumentLinePayload[]
  amount?: number | null
  paymentMethod?: string | null
  accountId?: string | null
}

/** Проведение, отмена и удаление меняют склад, балансы, кассы и отчёты. */
function invalidateAfterPosting(qc: QueryClient, id: number) {
  qc.invalidateQueries({ queryKey: ['documents'] })
  qc.invalidateQueries({ queryKey: ['document', id] })
  qc.invalidateQueries({ queryKey: ['counterparties'] })
  qc.invalidateQueries({ queryKey: ['products'] })
  qc.invalidateQueries({ queryKey: ['accounts'] })
  qc.invalidateQueries({ queryKey: ['reports'] })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation<DocumentDto, unknown, CreateDocumentPayload>({
    mutationFn: (data) => documentsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation<DocumentDto, unknown, { id: number; data: UpdateDocumentPayload }>({
    mutationFn: ({ id, data }) => documentsApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
    },
  })
}

export function useConfirmDocument() {
  const qc = useQueryClient()
  return useMutation<DocumentDto, unknown, number>({
    mutationFn: (id) => documentsApi.confirm(id),
    onSuccess: (_data, id) => invalidateAfterPosting(qc, id),
  })
}

export function useCancelDocument() {
  const qc = useQueryClient()
  return useMutation<DocumentDto, unknown, number>({
    mutationFn: (id) => documentsApi.cancel(id),
    onSuccess: (_data, id) => invalidateAfterPosting(qc, id),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation<void, unknown, number>({
    mutationFn: (id) => documentsApi.delete(id),
    onSuccess: (_data, id) => invalidateAfterPosting(qc, id),
  })
}
