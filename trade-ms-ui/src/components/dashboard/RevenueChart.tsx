import { useTranslation } from 'react-i18next'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/format'
import type { MonthlySales } from '@/api/hooks/useReports'

const REVENUE_COLOR = '#22D3EE' // циан — фирменный акцент
const PROFIT_COLOR = '#F59E0B' // amber — контраст с циановыми столбцами

/** Компактный формат оси Y: 57 000 000 → «57 млн» */
function formatAxis(value: number): string {
  if (value === 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
  if (value >= 1_000) return `${Math.round(value / 1_000)} тыс`
  return value.toLocaleString('ru-RU')
}

function renderTooltip(
  { active, payload, label }: TooltipContentProps,
  revenueLabel: string,
  profitLabel: string,
) {
  if (!active || !payload?.length) return null
  const revenue = Number(payload.find((p) => p.dataKey === 'revenue')?.value ?? 0)
  const profit = Number(payload.find((p) => p.dataKey === 'profit')?.value ?? 0)
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-card px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-xs font-semibold text-[hsl(var(--text-primary))]">{label}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REVENUE_COLOR }} />
        <span className="text-[hsl(var(--text-muted))]">{revenueLabel}</span>
        <span className="ml-auto font-semibold text-[hsl(var(--text-primary))]">{formatCurrency(revenue)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFIT_COLOR }} />
        <span className="text-[hsl(var(--text-muted))]">{profitLabel}</span>
        <span className="ml-auto font-semibold text-[hsl(var(--text-primary))]">{formatCurrency(profit)}</span>
      </div>
    </div>
  )
}

interface Props {
  className?: string
  loading?: boolean
  monthlySales?: MonthlySales[]
}

export function RevenueChart({ className, loading, monthlySales }: Props) {
  const { t } = useTranslation()

  if (loading || !monthlySales) {
    return (
      <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5 animate-pulse', className)}>
        <div className="mb-4 h-4 w-32 rounded bg-[hsl(var(--surface-2))]" />
        <div className="h-56 rounded bg-[hsl(var(--surface-2))]" />
      </div>
    )
  }

  const revenueLabel = t('dashboard.revenue')
  const profitLabel = t('dashboard.profit')

  return (
    <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('dashboard.revenueAndProfit')}</h3>
        <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-muted))]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: REVENUE_COLOR }} />
            {revenueLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFIT_COLOR }} />
            {profitLabel}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={224}>
        <ComposedChart data={monthlySales} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="revenue-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.95} />
              <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.55} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />

          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={formatAxis}
          />

          <Tooltip
            cursor={{ fill: 'hsl(var(--surface-2))', opacity: 0.4 }}
            content={(props) => renderTooltip(props, revenueLabel, profitLabel)}
          />

          <Bar
            dataKey="revenue"
            fill="url(#revenue-bar)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="profit"
            stroke={PROFIT_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: PROFIT_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
