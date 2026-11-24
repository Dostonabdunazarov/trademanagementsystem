import type { CSSProperties } from 'react'
import { CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { SalesSummaryItem } from '@/api/hooks/useReports'
import { formatCompact, formatCurrency, formatNumber, formatPercent } from '@/utils/format'
import { ChartCard, ChartEmpty, ChartTooltipBox } from './ChartCard'
import { AXIS_TICK, GRID_STROKE, TOOLTIP_WRAPPER } from './chartStyles'

interface Props {
  lines?: SalesSummaryItem[]
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Прибыльность товаров (п. 5): X — выручка, Y — маржа, размер точки — сколько продано.
 * Цвет относительно средней маржи: выше — --chart-1, ниже — --chart-3, в минусе — --chart-4.
 * Правый нижний угол — «продаётся много, зарабатывает мало».
 */
export function ProductProfitChart({ lines, loading, className, style }: Props) {
  const { t } = useTranslation()
  const points = (lines ?? [])
    .filter((l) => l.revenue > 0)
    .map((l) => ({
      name: l.productName,
      unit: l.unit,
      revenue: l.revenue,
      profit: l.profit,
      quantity: l.quantitySold,
      margin: Math.round((l.profit / l.revenue) * 1000) / 10,
    }))
  const revenue = points.reduce((s, p) => s + p.revenue, 0)
  const avg = revenue > 0 ? (points.reduce((s, p) => s + p.profit, 0) / revenue) * 100 : 0

  const colorOf = (margin: number) =>
    margin < 0 ? 'var(--chart-4)' : margin >= avg ? 'var(--chart-1)' : 'var(--chart-3)'

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof points)[number]
    return (
      <ChartTooltipBox
        title={p.name}
        rows={[
          { color: colorOf(p.margin), label: t('dashboard.margin'), value: formatPercent(p.margin) },
          { label: t('dashboard.revenue'), value: formatCurrency(p.revenue) },
          { label: t('dashboard.profit'), value: formatCurrency(p.profit) },
          { label: t('dashboard.quantitySold'), value: `${formatNumber(p.quantity)} ${t(`products.units.${p.unit}`, { defaultValue: p.unit })}` },
        ]}
      />
    )
  }

  const legend = [
    { color: 'var(--chart-1)', label: t('dashboard.aboveAvg') },
    { color: 'var(--chart-3)', label: t('dashboard.belowAvg') },
    { color: 'var(--chart-4)', label: t('dashboard.loss') },
  ]

  return (
    <ChartCard
      title={t('dashboard.productProfit')}
      subtitle={t('dashboard.productProfitHint')}
      aside={points.length > 0 && (
        <div className="hidden gap-3 text-[11px] text-[hsl(var(--text-muted))] sm:flex">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      loading={loading}
      bodyHeight={260}
      className={className}
      style={style}
    >
      {points.length === 0 ? (
        <ChartEmpty text={t('dashboard.noSalesInPeriod')} height={260} />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} />
            <XAxis
              type="number"
              dataKey="revenue"
              name={t('dashboard.revenue')}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              tickFormatter={formatCompact}
              dy={6}
            />
            <YAxis
              type="number"
              dataKey="margin"
              name={t('dashboard.margin')}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatPercent(v)}
            />
            <ZAxis type="number" dataKey="quantity" range={[50, 420]} />
            <ReferenceLine
              y={avg}
              stroke="hsl(var(--text-muted))"
              strokeDasharray="4 4"
              label={{ value: t('dashboard.avgMarginLine', { value: formatPercent(avg) }), position: 'insideTopRight', fontSize: 11, fill: 'var(--chart-axis)' }}
            />
            <Tooltip wrapperStyle={TOOLTIP_WRAPPER} cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--text-muted))' }} content={tooltip} />
            <Scatter data={points} animationDuration={900} animationEasing="ease-out">
              {points.map((p) => <Cell key={p.name} fill={colorOf(p.margin)} fillOpacity={0.85} stroke="hsl(var(--card))" strokeWidth={1.5} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
