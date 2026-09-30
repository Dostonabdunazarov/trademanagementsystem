import { useQuery } from '@tanstack/react-query'
import { currenciesApi } from '../currencies'

/** ExchangeRateDto на бэкенде. */
export interface ExchangeRateDto {
  id: string
  fromCurrencyId: string
  fromCurrencyCode: string
  toCurrencyId: string
  toCurrencyCode: string
  rate: number
  date: string
}

/** Без `date` — последний курс по каждой паре; с `date` — курсы ровно на эту дату. */
export function useExchangeRates(date?: string, options: { enabled?: boolean } = {}) {
  return useQuery<ExchangeRateDto[]>({
    queryKey: ['exchange-rates', date ?? null],
    queryFn: () => currenciesApi.getRates(date),
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  })
}

/**
 * Курс from → to, действующий на дату документа. Сервер отдаёт по `?date=`
 * последний курс каждой пары на эту дату или раньше — так же он выбирает курс
 * при проведении. `null` — курса нет (проведение вернёт exchangeRateNotFound).
 */
export function useExchangeRateOn(fromCurrencyId?: string, toCurrencyId?: string, date?: string) {
  const enabled = !!fromCurrencyId && !!toCurrencyId && fromCurrencyId !== toCurrencyId && !!date
  const onDate = useExchangeRates(date, { enabled })

  const rate = enabled
    ? onDate.data?.find((r: ExchangeRateDto) => r.fromCurrencyId === fromCurrencyId && r.toCurrencyId === toCurrencyId)?.rate ?? null
    : null

  return { rate, isLoading: enabled && onDate.isLoading }
}
