import type { CSSProperties } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MonthlySales } from '@/api/hooks/useReports'
import { formatCurrency, formatPercent } from '@/utils/format'
import { cn } from '@/lib/utils'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_WRAPPER } from './chartStyles'

interface Props {
  monthlySales?: MonthlySales[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/** Маржинальность по месяцам (п. 3): прибыль / выручка, %. Месяцы без продаж — разрыв. */
export function MarginChart({ monthlySales, loading, className, style }: Props) {
  const { t } = useTranslation()
  const data = (monthlySales ?? []).map((m) => ({
    ...m,
    margin: m.revenue > 0 ? Math.round((m.profit / m.revenue) * 1000) / 10 : null,
  }))
  const revenue = data.reduce((s, m) => s + m.revenue, 0)
  const profit = data.reduce((s, m) => s + m.profit, 0)
  const avg = revenue > 0 ? (profit / revenue) * 100 : null

  const tooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof data)[number]
    return (
      <ChartTooltipBox
        title={label}
        rows={[
          { color: 'var(--chart-4)', label: t('dashboard.margin'), value: p.margin == null ? '—' : formatPercent(p.margin) },
          { label: t('dashboard.profit'), value: formatCurrency(p.profit) },
        ]}
      />
    )
  }

  return (
    <ChartCard
      title={t('dashboard.margin')}
      subtitle={t('dashboard.marginHint')}
      aside={avg != null && (
        <div className="text-right">
          <div className={cn('font-mono text-lg font-semibold tabular-nums', avg >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatPercent(avg)}
          </div>
          <div className="text-[10px] text-[hsl(var(--text-muted))]">{t('dashboard.avgMargin')}</div>
        </div>
      )}
      loading={loading}
      bodyHeight={180}
      className={className}
      style={style}
    >
      {avg == null ? (
        <ChartEmpty text={t('dashboard.noSalesInPeriod')} height={180} />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="margin-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'var(--chart-4)', stopOpacity: 0.4 }} />
                <stop offset="100%" style={{ stopColor: 'var(--chart-4)', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" dy={6} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
            <ReferenceLine y={avg} stroke="var(--chart-4)" strokeOpacity={0.5} strokeDasharray="4 4" />
            <Tooltip wrapperStyle={TOOLTIP_WRAPPER} cursor={{ stroke: 'hsl(var(--text-muted))', strokeDasharray: '3 3' }} content={tooltip} />
            <Area
              type="monotone"
              dataKey="margin"
              stroke="var(--chart-4)"
              strokeWidth={2}
              fill="url(#margin-fill)"
              connectNulls={false}
              dot={{ r: 2.5, fill: 'var(--chart-4)', strokeWidth: 0 }}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
