import { useQuery } from '@tanstack/react-query'
import { counterpartiesApi } from '../counterparties'

export type CounterpartyType = 'Customer' | 'Supplier' | 'Both'

/** CounterpartyDto на бэкенде. */
export interface CounterpartyDto {
  id: string
  companyId: string
  type: CounterpartyType
  name: string
  phone: string | null
  address: string | null
  creditLimit: number
  balance: number
  createdAt: string
}

export interface CounterpartiesPage {
  items: CounterpartyDto[]
  totalCount: number
  page: number
  pageSize: number
}

/**
 * `type=Customer` возвращает и Customer, и Both; `type=Supplier` — Supplier и Both
 * (фильтр на сервере), поэтому клиентских обходов не нужно.
 */
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
