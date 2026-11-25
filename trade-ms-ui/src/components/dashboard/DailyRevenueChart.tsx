import type { CSSProperties } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import type { DailySales } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency, formatPercent, todayIso } from '@/utils/format'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_WRAPPER } from './chartStyles'

const REVENUE_COLOR = 'var(--chart-daily)'
const PROFIT_COLOR = 'var(--chart-profit)'
const BAR_OPACITY = 0.55

interface Props {
  dailySales?: DailySales[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/** Выручка по дням выбранного периода (п. 8): столбик — выручка, узкий столбик — прибыль. */
export function DailyRevenueChart({ dailySales, loading, className, style }: Props) {
  const { t } = useTranslation()
  const today = todayIso()
  const data = (dailySales ?? [])
    .filter((d) => d.date <= today)
    .map((d) => {
      const profitPart = Math.max(d.profit, 0)
      return {
        ...d,
        costPart: Math.max(d.revenue - profitPart, 0),
        profitPart,
        day: format(parseISO(d.date), 'd'),
        label: format(parseISO(d.date), 'dd.MM.yyyy'),
      }
    })
  const total = data.reduce((s, d) => s + d.revenue, 0)
  const totalProfit = data.reduce((s, d) => s + d.profit, 0)
  const activeDays = data.filter((d) => d.revenue > 0).length
  const best = data.reduce<(typeof data)[number] | undefined>((b, d) => (!b || d.revenue > b.revenue ? d : b), undefined)

  const stats = [
    { label: t('dashboard.dailyAvg'), value: formatCompact(data.length ? total / data.length : 0) },
    {
      label: t('dashboard.dailyBest'),
      value: best && best.revenue > 0 ? formatCompact(best.revenue) : '—',
      hint: best && best.revenue > 0 ? format(parseISO(best.date), 'dd.MM') : undefined,
    },
    { label: t('dashboard.dailyActive'), value: t('dashboard.dailyActiveOf', { active: activeDays, total: data.length }) },
    { label: t('dashboard.dailyMargin'), value: total > 0 ? formatPercent((totalProfit / total) * 100) : '—' },
  ]

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof data)[number]
    return (
      <ChartTooltipBox
        title={p.label}
        rows={[
          { label: t('dashboard.revenue'), value: formatCurrency(p.revenue) },
          { color: REVENUE_COLOR, label: t('reports.cost'), value: formatCurrency(p.revenue - p.profit) },
          { color: PROFIT_COLOR, label: t('dashboard.profit'), value: formatCurrency(p.profit) },
        ]}
      />
    )
  }

  const legend = [
    { color: REVENUE_COLOR, label: t('reports.cost'), opacity: BAR_OPACITY },
    { color: PROFIT_COLOR, label: t('dashboard.profit'), opacity: 1 },
  ]

  return (
    <ChartCard
      title={t('dashboard.dailyRevenue')}
      subtitle={t('dashboard.dailyRevenueHint')}
      aside={data.length > 0 && (
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatCompact(total)}</span>
          <div className="flex gap-3 text-[11px] text-[hsl(var(--text-muted))]">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}
      loading={loading}
      className={className}
      style={style}
    >
      {data.length === 0 ? (
        <ChartEmpty text={t('dashboard.dailyTooLong')} />
      ) : (
        <div className="flex h-full flex-col gap-4">
          <div className="h-[224px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={12} dy={6} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={formatCompact} />
                <Tooltip wrapperStyle={TOOLTIP_WRAPPER} cursor={{ fill: 'hsl(var(--surface-2))' }} content={tooltip} />
                <Bar
                  dataKey="costPart"
                  stackId="revenue"
                  fill={REVENUE_COLOR}
                  fillOpacity={BAR_OPACITY}
                  activeBar={{ fillOpacity: 0.8 }}
                  maxBarSize={28}
                  animationDuration={700}
                />
                <Bar
                  dataKey="profitPart"
                  stackId="revenue"
                  fill={PROFIT_COLOR}
                  fillOpacity={0.85}
                  activeBar={{ fillOpacity: 1 }}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                  animationDuration={700}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-auto grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 bg-[hsl(var(--surface-2))]/60 px-3.5 py-3 backdrop-blur-sm">
                <dt className="text-[11px] font-medium text-[hsl(var(--text-muted))]">{s.label}</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold tabular-nums text-[hsl(var(--text-primary))]">{s.value}</span>
                  {s.hint && <span className="text-[11px] tabular-nums text-[hsl(var(--text-muted))]">{s.hint}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </ChartCard>
  )
}
