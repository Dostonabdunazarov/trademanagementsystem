import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useCounterpartyBalance } from '@/api/hooks/useReports'
import { cn } from '@/lib/utils'
import { formatCompact, formatCurrency } from '@/utils/format'
import { ChartCard } from './ChartCard'

/** Порог «близко к лимиту»: долг от 80% кредитного лимита. */
const NEAR_LIMIT = 0.8

interface Props {
  debtorDebt?: number
  creditorDebt?: number
  loading?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Баланс долгов (п. 7): сколько должны нам и сколько должны мы, сальдо между ними,
 * и клиенты, чей долг подошёл к кредитному лимиту или превысил его.
 */
export function DebtBalanceWidget({ debtorDebt = 0, creditorDebt = 0, loading, className, style }: Props) {
  const { t } = useTranslation()
  const { data: customers } = useCounterpartyBalance('Customer')

  // Отрицательный остаток — предоплата, а не долг: на полосе показываем ноль.
  const owedToUs = Math.max(0, debtorDebt)
  const weOwe = Math.max(0, creditorDebt)
  const max = Math.max(owedToUs, weOwe, 1)
  const net = owedToUs - weOwe

  const atLimit = (customers?.lines ?? [])
    .filter((c) => c.creditLimit > 0 && c.balance >= c.creditLimit * NEAR_LIMIT)
    .map((c) => ({ ...c, ratio: c.balance / c.creditLimit }))
    // Сначала превысившие — по сумме сверх лимита, затем приближающиеся.
    .sort((a, b) => (b.balance - b.creditLimit) - (a.balance - a.creditLimit))
  const nearLimit = atLimit.slice(0, 4)
  const hidden = atLimit.length - nearLimit.length

  const bars = [
    { label: t('dashboard.owedToUs'), value: owedToUs, color: 'var(--chart-4)' },
    { label: t('dashboard.weOwe'), value: weOwe, color: 'var(--chart-5)' },
  ]

  return (
    <ChartCard title={t('dashboard.debtBalance')} loading={loading} bodyHeight={224} className={className} style={style}>
      <div className="space-y-3">
        {bars.map((b, i) => (
          <div key={b.label} title={formatCurrency(b.value)}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--text-muted))]">{b.label}</span>
              <span className="font-mono font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatCompact(b.value)}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
              <div
                className="anim-grow-x h-full rounded-full"
                style={{ width: `${(b.value / max) * 100}%`, backgroundColor: b.color, '--delay': `${450 + i * 100}ms` } as CSSProperties}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--surface-2))] px-3 py-2 text-xs">
          <span className="text-[hsl(var(--text-muted))]">{t('dashboard.netBalance')}</span>
          <span className={cn('font-mono font-semibold tabular-nums', net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {net > 0 ? '+' : ''}{formatCompact(net)}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-[hsl(var(--border))] pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('dashboard.creditLimits')}</p>
        <p className="mb-2.5 text-[10px] text-[hsl(var(--text-muted))]">{t('dashboard.creditLimitsHint')}</p>
        {nearLimit.length === 0 ? (
          <p className="text-xs text-[hsl(var(--text-muted))]">{t('dashboard.noLimitIssues')}</p>
        ) : (
          <ul className="space-y-2">
            {nearLimit.map((c, i) => {
              const over = c.balance > c.creditLimit
              // Шкала — большее из долга и лимита; отметка показывает, где кончается лимит.
              const scale = Math.max(c.balance, c.creditLimit)
              const limitAt = (c.creditLimit / scale) * 100
              const withinAt = (Math.min(c.balance, c.creditLimit) / scale) * 100
              return (
                <li key={c.id} className="anim-rise text-xs" style={{ '--delay': `${600 + i * 60}ms` } as CSSProperties}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[hsl(var(--text-primary))]">{c.name}</span>
                    <span className="shrink-0 font-mono tabular-nums text-[hsl(var(--text-muted))]" title={`${formatCurrency(c.balance)} / ${formatCurrency(c.creditLimit)}`}>
                      <span className="text-[hsl(var(--text-primary))]">{formatCompact(c.balance)}</span> {t('dashboard.ofLimit')} {formatCompact(c.creditLimit)}
                    </span>
                  </div>
                  <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                    <div
                      className="anim-grow-x absolute inset-y-0 left-0 rounded-full bg-orange-500"
                      style={{ width: `${withinAt}%`, '--delay': `${650 + i * 60}ms` } as CSSProperties}
                    />
                    {over && (
                      <div
                        className="anim-grow-x absolute inset-y-0 rounded-r-full bg-red-500"
                        style={{ left: `${limitAt}%`, right: 0, '--delay': `${650 + i * 60}ms` } as CSSProperties}
                      />
                    )}
                    <div className="absolute inset-y-0 w-0.5 bg-[hsl(var(--text-primary))]" style={{ left: `calc(${limitAt}% - 1px)` }} />
                  </div>
                  <p className={cn('mt-0.5 text-[10px]', over ? 'text-red-400' : 'text-orange-400')}>
                    {over
                      ? t('dashboard.overLimit', { amount: formatCompact(c.balance - c.creditLimit) })
                      : t('dashboard.limitLeft', { amount: formatCompact(c.creditLimit - c.balance) })}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {hidden > 0 && (
          <p className="mt-2 text-[10px] text-[hsl(var(--text-muted))]">{t('dashboard.moreClients', { count: hidden })}</p>
        )}
      </div>
    </ChartCard>
  )
}
