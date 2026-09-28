import type { CSSProperties } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { SalesSummaryItem } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency, formatPercent } from '@/utils/format'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'

const TOP = 5
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

interface Props {
  lines?: SalesSummaryItem[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/** Структура продаж (п. 4): доля выручки топ-5 товаров, остальное — «Прочее». */
export function SalesStructureChart({ lines, loading, className, style }: Props) {
  const { t } = useTranslation()
  const sorted = [...(lines ?? [])].filter((l) => l.revenue > 0).sort((a, b) => b.revenue - a.revenue)
  const total = sorted.reduce((s, l) => s + l.revenue, 0)
  const rest = sorted.slice(TOP).reduce((s, l) => s + l.revenue, 0)
  const slices = [
    ...sorted.slice(0, TOP).map((l) => ({ name: l.productName, value: l.revenue })),
    ...(rest > 0 ? [{ name: t('dashboard.others'), value: rest }] : []),
  ].map((s, i) => ({ ...s, color: COLORS[i], share: total > 0 ? (s.value / total) * 100 : 0 }))

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof slices)[number]
    return (
      <ChartTooltipBox
        title={p.name}
        rows={[
          { color: p.color, label: t('dashboard.revenue'), value: formatCurrency(p.value) },
          { label: t('dashboard.share'), value: formatPercent(p.share) },
        ]}
      />
    )
  }

  return (
    <ChartCard
      title={t('dashboard.salesStructure')}
      subtitle={t('dashboard.salesStructureHint')}
      loading={loading}
      bodyHeight={180}
      className={className}
      style={style}
    >
      {slices.length === 0 ? (
        <ChartEmpty text={t('dashboard.noSalesInPeriod')} height={180} />
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip content={tooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('dashboard.total')}</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatCompact(total)}</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((s, i) => (
              <li
                key={s.name}
                className="anim-rise flex items-center gap-2 text-xs"
                style={{ '--delay': `${500 + i * 60}ms` } as CSSProperties}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1 truncate text-[hsl(var(--text-primary))]">{s.name}</span>
                <span className="font-mono tabular-nums text-[hsl(var(--text-muted))]">{formatPercent(s.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
