import { useMutation, useQueryClient } from '@tanstack/react-query'
import { counterpartiesApi } from '../counterparties'

export interface CreateCounterpartyDto {
  name: string
  type: 'Customer' | 'Supplier' | 'Both'
  phone?: string
  address?: string
  creditLimit?: number
}

export function useCreateCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCounterpartyDto) => counterpartiesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counterparties'] }),
  })
}

export function useUpdateCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCounterpartyDto }) =>
      counterpartiesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counterparties'] }),
  })
}

export function useDeleteCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => counterpartiesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counterparties'] }),
  })
}
