import { useQuery } from '@tanstack/react-query'
import { counterpartiesApi } from '../counterparties'

export interface CounterpartyDto {
  id: string
  name: string
  type: string
  phone: string | null
  balance: number
  creditLimit: number
}

export interface CounterpartiesPage {
  items: CounterpartyDto[]
  totalCount: number
  page: number
  pageSize: number
}

export function useCounterparties(
  type?: 'Customer' | 'Supplier',
  search?: string,
  page = 1,
  pageSize = 20,
) {
  return useQuery<CounterpartiesPage>({
    queryKey: ['counterparties', { type, search, page, pageSize }],
    queryFn: () => counterpartiesApi.getAll({ type, search, page, pageSize }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
