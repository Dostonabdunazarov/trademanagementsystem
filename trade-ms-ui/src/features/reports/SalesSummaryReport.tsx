import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, subDays } from 'date-fns'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useSalesSummary } from '@/api/hooks/useReports'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/ui.store'
import { DatePicker } from '@/components/ui/date-picker'

function MetricBadge({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-5 py-4">
      <p className="text-xs text-[hsl(var(--text-muted))] mb-1">{label}</p>
      <p className="font-mono text-xl font-semibold tabular-nums text-[hsl(var(--text-primary))]">{value}</p>
      {sub && <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{sub}</p>}
    </div>
  )
}

export function SalesSummaryReport() {
  const { t } = useTranslation()
  const today = new Date()
  const [dateFrom, setDateFrom] = useState(format(subDays(today, 29), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'))
  const { activeBranch } = useUiStore()

  const { data, isLoading, isFetching, refetch, isError } = useSalesSummary({ dateFrom, dateTo, branchId: activeBranch?.id })

  const items = data?.lines ?? []

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('dashboard.from')}</label>
          <DatePicker value={dateFrom} max={dateTo} onChange={setDateFrom} className="h-9 bg-card text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('dashboard.to')}</label>
          <DatePicker value={dateTo} min={dateFrom} onChange={setDateTo} className="h-9 bg-card text-sm" />
        </div>
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
        <MetricBadge
          label={t('reports.revenue')}
          value={data ? formatNumber(data.totalRevenue) : '—'}
          sub={t('reports.inBaseCurrency')}
        />
        <MetricBadge
          label={t('reports.cost')}
          value={data ? formatNumber(data.totalCost ?? 0) : '—'}
        />
        <MetricBadge
          label={t('reports.profit')}
          value={data ? formatNumber(data.totalProfit ?? 0) : '—'}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.product')}</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.qty')}</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.revenue')}</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.costShort')}</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('reports.profit')}</th>
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
