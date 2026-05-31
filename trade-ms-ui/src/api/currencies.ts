import { apiClient } from './axios'

export const currenciesApi = {
  getAll: () =>
    apiClient.get('/currencies').then((r) => r.data),

  createCurrency: (data: unknown) =>
    apiClient.post('/currencies', data).then((r) => r.data),

  getRates: (date?: string) =>
    apiClient.get('/exchange-rates', { params: { date } }).then((r) => r.data),

  createRate: (data: unknown) =>
    apiClient.post('/exchange-rates', data).then((r) => r.data),
}
