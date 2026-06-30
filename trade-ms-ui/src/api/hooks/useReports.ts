import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'

export interface SalesSummaryItem {
  productId: string
  productName: string
  sku: string | null
  unit: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
}

export interface SalesSummaryResponse {
  dateFrom: string
  dateTo: string
  totalRevenue: number
  totalCost: number
  totalProfit: number
  totalDocuments: number
  lines: SalesSummaryItem[]
}

export interface StockBalanceItem {
  productId: string
  productName: string
  sku: string | null
  unit: string
  groupName: string
  branchId: string
  branchName: string
  quantity: number
  priceSell: number
  priceBuy: number
  totalSellValue: number
  totalBuyValue: number
}

export interface StockBalanceResponse {
  totalSellValue: number
  totalBuyValue: number
  lines: StockBalanceItem[]
}

export interface CounterpartyBalanceItem {
  id: string
  name: string
  type: string
  phone: string | null
  balance: number
  creditLimit: number
}

export interface CounterpartyBalanceResponse {
  totalDebit: number
  totalCredit: number
  lines: CounterpartyBalanceItem[]
}

export interface MonthlySales {
  year: number
  month: number
  monthLabel: string
  revenue: number
  profit: number
}

export interface DashboardSummaryResponse {
  dateFrom: string
  dateTo: string
  revenue: number
  profit: number
  debtorDebt: number
  stockItemCount: number
  creditorDebt: number
  cashIn: number
  cashOut: number
  salesCount: number
  averageCheck: number
  stockBuyValue: number
  revenueDelta: number | null
  profitDelta: number | null
  cashFlowDelta: number | null
  salesCountDelta: number | null
  monthlySales: MonthlySales[]
}

export function useSalesSummary(params?: { dateFrom?: string; dateTo?: string; branchId?: string }) {
  return useQuery<SalesSummaryResponse>({
    queryKey: ['reports', 'sales-summary', params],
    queryFn: () => reportsApi.getSalesSummary(params),
    enabled: true,
  })
}

export function useStockBalance(branchId?: string) {
  return useQuery<StockBalanceResponse>({
    queryKey: ['reports', 'stock-balance', branchId],
    queryFn: () => reportsApi.getStockBalance(branchId),
  })
}

export function useCounterpartyBalance(type?: string) {
  return useQuery<CounterpartyBalanceResponse>({
    queryKey: ['reports', 'counterparty-balance', type],
    queryFn: () => reportsApi.getCounterpartyBalance(type),
  })
}

export function useDashboardSummary(params?: { branchId?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery<DashboardSummaryResponse>({
    queryKey: ['reports', 'dashboard', params],
    queryFn: () => reportsApi.getDashboardSummary(params),
    staleTime: 60_000,
  })
}
