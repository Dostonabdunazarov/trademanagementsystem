import { type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string
  delta?: number
  deltaLabel?: string
  icon: LucideIcon
  iconColor?: string
  loading?: boolean
  className?: string
}

function Sparkline({ positive }: { positive: boolean }) {
  const points = positive
    ? '0,28 10,22 20,25 30,18 40,20 50,12 60,15 70,8 80,11 90,4'
    : '0,4 10,10 20,8 30,15 40,12 50,20 60,18 70,25 80,22 90,28'
  return (
    <svg width="90" height="32" viewBox="0 0 90 32" className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#10B981' : '#EF4444'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MetricCard({
  title,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor = 'text-indigo-400',
  loading,
  className,
}: MetricCardProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 animate-pulse', className)}>
        <div className="mb-3 h-3 w-24 rounded bg-[hsl(var(--surface-2))]" />
        <div className="h-7 w-32 rounded bg-[hsl(var(--surface-2))]" />
        <div className="mt-2 h-3 w-16 rounded bg-[hsl(var(--surface-2))]" />
      </div>
    )
  }

  const positive = (delta ?? 0) >= 0

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5 transition-all duration-200 hover:border-[hsl(var(--border))]/[2] hover:bg-[hsl(var(--surface-2))]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{title}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[hsl(var(--text-primary))]">{value}</p>
          {delta !== undefined && (
            <p
              className={cn(
                'mt-1 text-xs font-mono tabular-nums',
                positive ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {positive ? '▲' : '▼'} {Math.abs(delta)}% {deltaLabel ?? t('dashboard.perMonth')}
            </p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]')}>
          <Icon className={cn('h-5 w-5', iconColor)} strokeWidth={1.8} />
        </div>
      </div>
      <div className="absolute bottom-0 right-0 opacity-20 group-hover:opacity-40 transition-opacity">
        <Sparkline positive={positive} />
      </div>
    </div>
  )
}
