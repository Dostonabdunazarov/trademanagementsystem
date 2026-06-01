import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MonthlySales } from '@/api/hooks/useReports'

const W = 560
const H = 160
const PAD = { top: 12, right: 12, bottom: 28, left: 40 }
const chartW = W - PAD.left - PAD.right
const chartH = H - PAD.top - PAD.bottom

function toX(i: number, total: number) {
  return PAD.left + (i / Math.max(total - 1, 1)) * chartW
}
function toY(v: number, maxVal: number) {
  if (maxVal === 0) return PAD.top + chartH
  return PAD.top + chartH - (Math.max(v, 0) / maxVal) * chartH
}

function polylinePts(data: MonthlySales[], key: 'revenue' | 'profit', maxVal: number) {
  return data.map((d, i) => `${toX(i, data.length)},${toY(d[key], maxVal)}`).join(' ')
}

function areaPath(data: MonthlySales[], key: 'revenue' | 'profit', maxVal: number) {
  const pts = data.map((d, i) => `${toX(i, data.length)},${toY(d[key], maxVal)}`).join(' L ')
  return `M ${toX(0, data.length)},${toY(data[0][key], maxVal)} L ${pts} L ${toX(data.length - 1, data.length)},${H - PAD.bottom} L ${toX(0, data.length)},${H - PAD.bottom} Z`
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
        <div className="h-40 rounded bg-[hsl(var(--surface-2))]" />
      </div>
    )
  }

  const data = monthlySales
  const rawMax = Math.max(...data.map((d) => d.revenue), 1)

  // Round up maxVal to a nice round number for clean tick labels
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const nice = Math.ceil(rawMax / magnitude) * magnitude
  const maxVal = nice

  // Generate 4 evenly spaced ticks (0, 25%, 50%, 75%, 100%)
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((i / 4) * maxVal))

  return (
    <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('dashboard.revenueAndProfit')}</h3>
        <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-muted))]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            {t('dashboard.revenue')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {t('dashboard.profit')}
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {ticks.map((val) => {
          const y = toY(val, maxVal)
          return (
            <g key={val}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="hsl(215 20% 88%)" strokeWidth="0.4" />
              <text x={PAD.left - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="5.5" fill="#64748b">
                {val.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* Area fills */}
        <path d={areaPath(data, 'revenue', maxVal)} fill="url(#rev-grad)" />
        <path d={areaPath(data, 'profit', maxVal)} fill="url(#profit-grad)" />

        {/* Lines */}
        <polyline points={polylinePts(data, 'revenue', maxVal)} fill="none" stroke="#6366F1" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={polylinePts(data, 'profit', maxVal)} fill="none" stroke="#10B981" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={`${d.year}-${d.month}`}
            x={toX(i, data.length)}
            y={H - PAD.bottom + 14}
            textAnchor="middle"
            fontSize="5.5"
            fill="#334155"
          >
            {d.monthLabel}
          </text>
        ))}
      </svg>
    </div>
  )
}
