import { apiClient } from './axios'

export const reportsApi = {
  getSalesSummary: (params?: { dateFrom?: string; dateTo?: string; branchId?: string }) =>
    apiClient.get('/reports/sales-summary', { params }).then((r) => r.data),

  getStockBalance: (branchId?: string) =>
    apiClient.get('/reports/stock-balance', { params: { branchId } }).then((r) => r.data),

  getCounterpartyBalance: (type?: string) =>
    apiClient.get('/reports/counterparty-balance', { params: { type } }).then((r) => r.data),

  getDashboardSummary: (params?: { branchId?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get('/reports/dashboard', { params }).then((r) => r.data),

  getStockForecast: (params?: { branchId?: string; days?: number; limit?: number }) =>
    apiClient.get('/reports/stock-forecast', { params }).then((r) => r.data),
}
