import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '../documents'

export interface CreateDocumentLinePayload {
  productId: string
  quantity: number
  price: number
  discountPercent: number
}

export interface CreateDocumentPayload {
  type: string
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

export interface UpdateDocumentPayload extends Omit<CreateDocumentPayload, 'type'> {}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentPayload) => documentsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentPayload }) =>
      documentsApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
    },
  })
}

export function useConfirmDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentsApi.confirm(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['counterparties'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentsApi.delete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['counterparties'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
