import type { CSSProperties } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import type { DailySales } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency, todayIso } from '@/utils/format'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_WRAPPER } from './chartStyles'

const REVENUE_COLOR = 'var(--chart-revenue)'
const PROFIT_COLOR = 'var(--chart-profit)'

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
    .map((d) => ({ ...d, day: format(parseISO(d.date), 'd'), label: format(parseISO(d.date), 'dd.MM.yyyy') }))
  const total = data.reduce((s, d) => s + d.revenue, 0)

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof data)[number]
    return (
      <ChartTooltipBox
        title={p.label}
        rows={[
          { color: REVENUE_COLOR, label: t('dashboard.revenue'), value: formatCurrency(p.revenue) },
          { color: PROFIT_COLOR, label: t('dashboard.profit'), value: formatCurrency(p.profit) },
        ]}
      />
    )
  }

  const legend = [
    { color: REVENUE_COLOR, label: t('dashboard.revenue') },
    { color: PROFIT_COLOR, label: t('dashboard.profit') },
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
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: l.color }} />
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
        <div className="h-full min-h-[224px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={12} dy={6} />
              <XAxis dataKey="day" xAxisId="profit" hide />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={formatCompact} />
              <Tooltip wrapperStyle={TOOLTIP_WRAPPER} cursor={{ fill: 'hsl(var(--surface-2))' }} content={tooltip} />
              <Bar dataKey="revenue" fill={REVENUE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} animationDuration={700} />
              <Bar
                dataKey="profit"
                xAxisId="profit"
                fill={PROFIT_COLOR}
                stroke="hsl(var(--card))"
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
                barSize={6}
                animationBegin={300}
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
