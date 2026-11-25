import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useSalesSummary } from '@/api/hooks/useReports'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/ui.store'
import { PeriodFilter } from '@/components/dashboard/PeriodFilter'
import { defaultPeriod, type PeriodRange } from '@/components/dashboard/period'
import { HeadUnit, ReportStat } from './ReportStat'

export function SalesSummaryReport() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<PeriodRange>(defaultPeriod)
  const { dateFrom, dateTo } = period
  const { activeBranch } = useUiStore()

  const { data, isLoading, isFetching, refetch, isError } = useSalesSummary({ dateFrom, dateTo, branchId: activeBranch?.id })

  const items = data?.lines ?? []

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter value={period} onChange={setPeriod} />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-2 rounded-lg bg-brand-500/10 px-4 text-sm font-medium text-brand-400 ring-1 ring-brand-500/30 transition-all hover:bg-brand-500/20 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {t('reports.refresh')}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ReportStat
          label={t('reports.revenue')}
          value={data ? formatNumber(data.totalRevenue) : '—'}
          unit={data ? t('dashboard.sum') : undefined}
        />
        <ReportStat
          label={t('reports.cost')}
          value={data ? formatNumber(data.totalCost ?? 0) : '—'}
          unit={data ? t('dashboard.sum') : undefined}
        />
        <ReportStat
          label={t('reports.profit')}
          value={data ? formatNumber(data.totalProfit ?? 0) : '—'}
          unit={data ? t('dashboard.sum') : undefined}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.product')}</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.qty')}</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.revenue')}<HeadUnit unit={t('dashboard.sum')} /></th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.costShort')}<HeadUnit unit={t('dashboard.sum')} /></th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.profit')}<HeadUnit unit={t('dashboard.sum')} /></th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.marginShort')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('common.loading')}</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-red-400">{t('reports.loadError')}</td>
              </tr>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">{t('reports.noData')}</td>
              </tr>
            )}
            {items.map((row, idx) => {
              const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0
              const isPositive = row.profit >= 0
              return (
                <tr
                  key={row.productId}
                  className={cn('border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--surface-2))]', idx % 2 === 1 && 'bg-white/[0.01]')}
                >
                  <td className="px-4 py-3 text-[hsl(var(--text-primary))]">{row.productName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(row.quantitySold)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(row.revenue)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-muted))]">{formatNumber(row.cost)}</td>
                  <td className={cn('px-4 py-3 text-right font-mono tabular-nums', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                    <span className="inline-flex items-center gap-1">
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatNumber(row.profit)}
                    </span>
                  </td>
                  <td className={cn('px-4 py-3 text-right font-mono tabular-nums text-xs', isPositive ? 'text-emerald-400/80' : 'text-red-400/80')}>
                    {margin.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
