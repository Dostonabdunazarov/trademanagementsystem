import { useQuery } from '@tanstack/react-query'
import { currenciesApi } from '../currencies'

export interface ExchangeRateDto {
  id: string
  fromCurrencyId: string
  fromCurrencyCode: string
  toCurrencyId: string
  toCurrencyCode: string
  rate: number
  date: string
}

export function useExchangeRates(date?: string) {
  return useQuery<ExchangeRateDto[]>({
    queryKey: ['exchange-rates', date],
    queryFn: () => currenciesApi.getRates(date),
    staleTime: 5 * 60_000,
  })
}
