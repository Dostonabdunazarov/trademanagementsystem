import { useState } from 'react'
import { AlertTriangle, RefreshCw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStockBalance } from '@/api/hooks/useReports'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/ui.store'

const LOW_STOCK_THRESHOLD = 5

export function StockBalanceReport() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const { activeBranch } = useUiStore()

  const { data, isLoading, isFetching, refetch, isError } = useStockBalance(activeBranch?.id)

  const allItems = data?.lines ?? []
  const filtered = allItems.filter((item) => {
    const matchSearch = item.productName.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      item.groupName.toLowerCase().includes(search.toLowerCase())
    const matchLow = showLowOnly ? item.quantity <= LOW_STOCK_THRESHOLD : true
    return matchSearch && matchLow
  })

  const lowStockCount = allItems.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD).length

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input
            type="text"
            placeholder="Поиск по товару, SKU, группе…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-[hsl(var(--text-primary))] placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
        <button
          onClick={() => setShowLowOnly((v) => !v)}
          className={cn(
            'flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium ring-1 transition-all',
            showLowOnly
              ? 'bg-amber-500/15 text-amber-400 ring-amber-500/30'
              : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] ring-white/[0.06] hover:bg-white/[0.08]',
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Низкий остаток
          {lowStockCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
              {lowStockCount}
            </span>
          )}
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-2 rounded-lg bg-indigo-500/10 px-4 text-sm font-medium text-indigo-400 ring-1 ring-indigo-500/30 transition-all hover:bg-indigo-500/20 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Обновить
        </button>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-5 py-4">
            <p className="text-xs text-[hsl(var(--text-muted))] mb-1">Стоимость по ценам продажи</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(data.totalSellValue)}</p>
          </div>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-5 py-4">
            <p className="text-xs text-[hsl(var(--text-muted))] mb-1">Стоимость по ценам покупки</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(data.totalBuyValue)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Товар</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">SKU</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Группа</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Филиал</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Остаток</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Цена прод.</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Цена пок.</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Сумма прод.</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">Загрузка…</td></tr>
            )}
            {isError && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-red-400">Ошибка загрузки данных</td></tr>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">Нет данных</td></tr>
            )}
            {filtered.map((row, idx) => {
              const isLow = row.quantity <= LOW_STOCK_THRESHOLD
              return (
                <tr
                  key={row.productId}
                  className={cn('border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--surface-2))]', idx % 2 === 1 && 'bg-white/[0.01]')}
                >
                  <td className="px-4 py-3 text-[hsl(var(--text-primary))]">{row.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-muted))]">{row.sku || '—'}</td>
                  <td className="px-4 py-3 text-[hsl(var(--text-muted))] text-xs">{row.groupName}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-muted))]">{row.branchName}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('inline-flex items-center gap-1 font-mono tabular-nums', isLow ? 'text-amber-400' : 'text-[hsl(var(--text-primary))]')}>
                      {isLow && <AlertTriangle className="h-3 w-3" />}
                      {formatNumber(row.quantity)} {t(`products.units.${row.unit}`, row.unit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(row.priceSell)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-muted))]">{formatNumber(row.priceBuy)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(row.totalSellValue)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
