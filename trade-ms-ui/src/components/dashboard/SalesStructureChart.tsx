import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { SalesSummaryItem } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency, formatPercent } from '@/utils/format'
import { ChartCard, ChartEmpty } from './ChartCard'

const TOP = 8

interface Props {
  lines?: SalesSummaryItem[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/** Структура продаж (п. 4): доля выручки топ-8 товаров, остальное — «Прочее». */
export function SalesStructureChart({ lines, loading, className, style }: Props) {
  const { t } = useTranslation()
  const sorted = [...(lines ?? [])].filter((l) => l.revenue > 0).sort((a, b) => b.revenue - a.revenue)
  const total = sorted.reduce((s, l) => s + l.revenue, 0)
  const rest = sorted.slice(TOP).reduce((s, l) => s + l.revenue, 0)
  const rows = [
    ...sorted.slice(0, TOP).map((l) => ({ name: l.productName, value: l.revenue, other: false })),
    ...(rest > 0 ? [{ name: t('dashboard.others'), value: rest, other: true }] : []),
  ].map((r) => ({ ...r, share: total > 0 ? (r.value / total) * 100 : 0 }))
  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <ChartCard
      title={t('dashboard.salesStructure')}
      subtitle={t('dashboard.salesStructureHint')}
      aside={total > 0 && <span className="text-sm font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatCompact(total)}</span>}
      loading={loading}
      bodyHeight={180}
      className={className}
      style={style}
    >
      {rows.length === 0 ? (
        <ChartEmpty text={t('dashboard.noSalesInPeriod')} height={180} />
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.name}
              className="anim-rise"
              style={{ '--delay': `${450 + i * 50}ms` } as CSSProperties}
              title={`${r.name}: ${formatCurrency(r.value)}`}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className={r.other ? 'truncate text-[hsl(var(--text-muted))]' : 'truncate text-[hsl(var(--text-primary))]'}>{r.name}</span>
                <span className="shrink-0 tabular-nums text-[hsl(var(--text-muted))]">
                  {formatCompact(r.value)} · {formatPercent(r.share)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--track)]">
                <div
                  className="anim-grow-x h-full rounded-full"
                  style={{
                    width: `${(r.value / max) * 100}%`,
                    backgroundColor: r.other ? 'var(--chart-other)' : 'var(--chart-1)',
                    '--delay': `${500 + i * 50}ms`,
                  } as CSSProperties}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}
