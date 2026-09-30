import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { counterpartiesApi } from '../counterparties'
import type { CounterpartyType } from './useCounterparties'

/** CreateCounterpartyRequest / UpdateCounterpartyRequest на бэкенде. */
export interface CreateCounterpartyDto {
  type: CounterpartyType
  name: string
  phone: string | null
  address: string | null
  creditLimit: number
}

function invalidate(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['counterparties'] })
  // Балансы и лимиты контрагентов есть в отчётах и на дашборде.
  qc.invalidateQueries({ queryKey: ['reports'] })
}

export function useCreateCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCounterpartyDto) => counterpartiesApi.create(data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCounterpartyDto }) =>
      counterpartiesApi.update(id, data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteCounterparty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => counterpartiesApi.delete(id),
    onSuccess: () => invalidate(qc),
  })
}
