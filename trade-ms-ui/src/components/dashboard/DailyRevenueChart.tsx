import type { CSSProperties } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import type { DailySales } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency } from '@/utils/format'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'
import { AXIS_TICK, GRID_STROKE } from './chartStyles'

interface Props {
  dailySales?: DailySales[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/** Выручка по дням выбранного периода (п. 8): заливка — выручка, линия — прибыль. */
export function DailyRevenueChart({ dailySales, loading, className, style }: Props) {
  const { t } = useTranslation()
  const data = (dailySales ?? []).map((d) => ({ ...d, day: format(parseISO(d.date), 'd'), label: format(parseISO(d.date), 'dd.MM.yyyy') }))
  const total = data.reduce((s, d) => s + d.revenue, 0)

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof data)[number]
    return (
      <ChartTooltipBox
        title={p.label}
        rows={[
          { color: 'var(--chart-revenue)', label: t('dashboard.revenue'), value: formatCurrency(p.revenue) },
          { color: 'var(--chart-profit)', label: t('dashboard.profit'), value: formatCurrency(p.profit) },
        ]}
      />
    )
  }

  return (
    <ChartCard
      title={t('dashboard.dailyRevenue')}
      subtitle={t('dashboard.dailyRevenueHint')}
      aside={data.length > 0 && <span className="font-mono text-sm font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatCompact(total)}</span>}
      loading={loading}
      className={className}
      style={style}
    >
      {data.length === 0 ? (
        <ChartEmpty text={t('dashboard.dailyTooLong')} />
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="daily-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--chart-revenue)', stopOpacity: 0.45 }} />
                <stop offset="100%" style={{ stopColor: 'var(--chart-revenue)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" minTickGap={12} dy={6} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={formatCompact} />
            <Tooltip cursor={{ stroke: 'hsl(var(--text-muted))', strokeDasharray: '3 3' }} content={tooltip} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-revenue)"
              strokeWidth={2}
              fill="url(#daily-revenue)"
              animationDuration={1100}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="var(--chart-profit)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              animationBegin={400}
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
