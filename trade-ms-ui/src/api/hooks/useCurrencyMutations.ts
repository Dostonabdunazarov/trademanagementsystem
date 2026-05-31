import { useMutation, useQueryClient } from '@tanstack/react-query'
import { currenciesApi } from '../currencies'

export function useCreateCurrency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { code: string; name: string; isBase: boolean }) =>
      currenciesApi.createCurrency(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }),
  })
}

export function useCreateExchangeRate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      fromCurrencyId: string
      toCurrencyId: string
      rate: number
      date: string
    }) => currenciesApi.createRate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchange-rates'] }),
  })
}
