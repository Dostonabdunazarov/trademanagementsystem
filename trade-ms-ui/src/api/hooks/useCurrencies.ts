import { useQuery } from '@tanstack/react-query'
import { currenciesApi } from '../currencies'

export interface CurrencyDto {
  id: string
  code: string
  name: string
  isBase: boolean
}

export function useCurrencies() {
  return useQuery<CurrencyDto[]>({
    queryKey: ['currencies'],
    queryFn: () => currenciesApi.getAll(),
    staleTime: 10 * 60_000,
  })
}
