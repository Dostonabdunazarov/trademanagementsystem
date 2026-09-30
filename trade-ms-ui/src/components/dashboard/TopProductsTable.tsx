import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useSalesSummary, useStockBalance } from '@/api/hooks/useReports'
import { format, subDays } from 'date-fns'
import { useUiStore } from '@/store/ui.store'

const LOW_STOCK_THRESHOLD = 5

export function TopProductsTable({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { activeBranch } = useUiStore()
  const today = new Date()
  const { data, isLoading } = useSalesSummary({
    dateFrom: format(subDays(today, 29), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
    branchId: activeBranch?.id,
  })
  const { data: stock } = useStockBalance(activeBranch?.id)
  // Остаток товара по выбранному филиалу (или по всем) — для бейджа наличия.
  const stockByProduct = new Map<string, number>()
  for (const l of stock?.lines ?? []) stockByProduct.set(l.productId, (stockByProduct.get(l.productId) ?? 0) + l.quantity)

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5 animate-pulse', className)}>
        <div className="mb-4 h-4 w-36 rounded bg-[hsl(var(--surface-2))]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-3 h-8 rounded bg-[hsl(var(--surface-2))]" />
        ))}
      </div>
    )
  }

  const top5 = (data?.lines ?? []).slice(0, 5)
  const maxRevenue = Math.max(...top5.map((p) => p.revenue), 1)

  return (
    <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)}>
      <h3 className="mb-4 text-sm font-semibold text-[hsl(var(--text-primary))]">{t('dashboard.topProducts')}</h3>
      {top5.length === 0 ? (
        <p className="text-xs text-[hsl(var(--text-muted))]">{t('dashboard.noTopProducts')}</p>
      ) : (
        <div className="space-y-3">
          {top5.map(({ productId, productName, revenue, quantitySold }, idx) => {
            const rank = idx + 1
            const progress = Math.round((revenue / maxRevenue) * 100)
            const qty = stockByProduct.get(productId)
            const badge = qty == null
              ? null
              : qty <= 0
                ? { label: t('dashboard.outOfStock'), cls: 'bg-red-500/10 text-red-400' }
                : qty <= LOW_STOCK_THRESHOLD
                  ? { label: t('reports.lowStock'), cls: 'bg-orange-500/10 text-orange-400' }
                  : { label: t('dashboard.inStock'), cls: 'bg-emerald-500/10 text-emerald-400' }
            return (
              <div key={productId} className="anim-rise flex items-center gap-3" style={{ '--delay': `${500 + idx * 80}ms` } as CSSProperties}>
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                    rank === 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))]',
                  )}
                >
                  {rank}
                </span>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-[hsl(var(--text-primary))]">{productName}</p>
                    {badge && (
                      <span className={cn('ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', badge.cls)}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                      <div
                        className="anim-grow-x h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${progress}%`, '--delay': `${600 + idx * 80}ms` } as CSSProperties}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[hsl(var(--text-muted))]">
                      {quantitySold.toLocaleString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
