import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { StockBalanceItem } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency, formatPercent } from '@/utils/format'
import { ChartCard, ChartEmpty } from './ChartCard'

const TOP = 6
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-3)', 'var(--chart-6)']

interface Props {
  lines?: StockBalanceItem[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/** Склад по группам (п. 6): сколько денег лежит в товаре каждой группы, по закупочным ценам. */
export function StockByGroupChart({ lines, loading, className, style }: Props) {
  const { t } = useTranslation()

  const byGroup = new Map<string, number>()
  for (const l of lines ?? []) byGroup.set(l.groupName, (byGroup.get(l.groupName) ?? 0) + l.totalBuyValue)
  const sorted = [...byGroup].map(([name, value]) => ({ name, value })).filter((g) => g.value > 0).sort((a, b) => b.value - a.value)
  const total = sorted.reduce((s, g) => s + g.value, 0)
  const rest = sorted.slice(TOP).reduce((s, g) => s + g.value, 0)
  const groups = [...sorted.slice(0, TOP), ...(rest > 0 ? [{ name: t('dashboard.others'), value: rest }] : [])]
  const max = groups[0]?.value ?? 1

  return (
    <ChartCard
      title={t('dashboard.stockByGroup')}
      subtitle={t('dashboard.stockByGroupHint')}
      aside={total > 0 && <span className="font-mono text-sm font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatCompact(total)}</span>}
      loading={loading}
      bodyHeight={260}
      className={className}
      style={style}
    >
      {groups.length === 0 ? (
        <ChartEmpty text={t('dashboard.noStock')} height={260} />
      ) : (
        <ul className="space-y-3.5">
          {groups.map((g, i) => (
            <li
              key={g.name}
              className="anim-rise"
              style={{ '--delay': `${450 + i * 70}ms` } as CSSProperties}
              title={formatCurrency(g.value)}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-[hsl(var(--text-primary))]">{g.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-[hsl(var(--text-muted))]">
                  {formatCompact(g.value)} · {formatPercent((g.value / total) * 100)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                <div
                  className="anim-grow-x h-full rounded-full"
                  style={{
                    width: `${(g.value / max) * 100}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                    '--delay': `${550 + i * 70}ms`,
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
