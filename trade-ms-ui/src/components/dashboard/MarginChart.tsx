import type { CSSProperties } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MonthlySales } from '@/api/hooks/useReports'
import { formatCurrency, formatPercent } from '@/utils/format'
import { cn } from '@/lib/utils'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_WRAPPER } from './chartStyles'

const MARGIN_COLOR = 'var(--chart-1)'

interface Props {
  monthlySales?: MonthlySales[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

function marginDomain(values: number[]): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const lo = min >= 0 ? min * 0.8 : min * 1.1
  const hi = max >= 0 ? max * 1.1 : max * 0.8
  if (hi - lo < 2) return [Math.floor(lo - 1), Math.ceil(hi + 1)]
  return [Math.floor(lo), Math.ceil(hi)]
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
  const margins = data.flatMap((m) => (m.margin == null ? [] : [m.margin]))
  const domain = margins.length > 0 ? marginDomain(margins) : undefined

  const tooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof data)[number]
    return (
      <ChartTooltipBox
        title={label}
        rows={[
          { color: MARGIN_COLOR, label: t('dashboard.margin'), value: p.margin == null ? '—' : formatPercent(p.margin) },
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
          <div className={cn('text-xl font-semibold tabular-nums', avg >= 0 ? 'text-[hsl(var(--text-primary))]' : 'text-[var(--negative)]')}>
            {formatPercent(avg)}
          </div>
          <div className="text-xs text-[hsl(var(--text-muted))]">{t('dashboard.avgMargin')}</div>
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
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="monthLabel" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval="preserveStartEnd" dy={6} />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={domain}
              allowDataOverflow
              tickFormatter={(v: number) => formatPercent(v)}
            />
            <ReferenceLine y={avg} stroke="hsl(var(--text-muted))" strokeOpacity={0.6} strokeDasharray="4 4" />
            <Tooltip wrapperStyle={TOOLTIP_WRAPPER} cursor={{ stroke: 'hsl(var(--text-muted))', strokeDasharray: '3 3' }} content={tooltip} />
            <Line
              type="linear"
              dataKey="margin"
              stroke={MARGIN_COLOR}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3, fill: MARGIN_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
