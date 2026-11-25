import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/lib/useCountUp'
import { formatPercent } from '@/utils/format'

interface MetricCardProps {
  title: string
  value: string
  /** Числовое значение: если задано, показывается с анимацией счёта (value тогда не нужен). */
  amount?: number
  formatAmount?: (n: number) => string
  unit?: string
  delta?: number
  deltaLabel?: string
  icon?: LucideIcon
  iconColor?: string
  loading?: boolean
  className?: string
  style?: CSSProperties
}

function AnimatedAmount({ amount, format }: { amount: number; format: (n: number) => string }) {
  const shown = useCountUp(amount)
  return <>{format(Math.round(shown))}</>
}

export function MetricCard({
  title,
  value,
  amount,
  formatAmount = (n) => n.toLocaleString('ru-RU'),
  unit,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor = 'text-brand-500',
  loading,
  className,
  style,
}: MetricCardProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5 animate-pulse', className)}>
        <div className="mb-3 h-3 w-24 rounded bg-[hsl(var(--surface-2))]" />
        <div className="h-7 w-32 rounded bg-[hsl(var(--surface-2))]" />
        <div className="mt-2 h-3 w-16 rounded bg-[hsl(var(--surface-2))]" />
      </div>
    )
  }

  const positive = (delta ?? 0) >= 0

  return (
    <div
      className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[hsl(var(--text-muted))]">{title}</p>
          <p className="mt-1.5 text-[28px] font-normal leading-tight tabular-nums tracking-tight text-[hsl(var(--text-primary))]">
            {amount !== undefined ? <AnimatedAmount amount={amount} format={formatAmount} /> : value}
            {unit && <span className="ml-1.5 text-sm font-normal tracking-normal text-[hsl(var(--text-muted))]">{unit}</span>}
          </p>
          {delta !== undefined && (
            <p className="mt-1.5 text-xs tabular-nums text-[hsl(var(--text-muted))]">
              <span className={cn('font-semibold', positive ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
                {positive ? '▲' : '▼'} {formatPercent(Math.abs(delta))}
              </span>{' '}
              {deltaLabel ?? t('dashboard.perMonth')}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))]">
            <Icon className={cn('h-5 w-5', iconColor)} strokeWidth={1.8} aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}
