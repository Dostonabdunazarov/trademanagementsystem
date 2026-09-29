import type { CSSProperties } from 'react'
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useCounterpartyBalance } from '@/api/hooks/useReports'
import { formatCompact } from '@/utils/format'

/** Порог «близко к лимиту» — как в блоке «Кредитные лимиты» (DebtBalanceWidget). */
const NEAR_LIMIT = 0.8

// Цвет — по кредитному лимиту клиента, а не по сравнению с крупнейшим должником:
// так подсветка совпадает с блоком «Кредитные лимиты» и говорит о реальном риске.
const RISK_STYLES = {
  over: { bar: 'bg-red-500', icon: <AlertTriangle className="h-3 w-3 text-red-400" />, label: 'text-red-400' },
  near: { bar: 'bg-orange-500', icon: <AlertTriangle className="h-3 w-3 text-orange-400" />, label: 'text-orange-400' },
  ok: { bar: 'bg-emerald-500', icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />, label: 'text-[hsl(var(--text-primary))]' },
  noLimit: { bar: 'bg-[hsl(var(--text-muted))]/50', icon: <Circle className="h-3 w-3 text-[hsl(var(--text-muted))]" />, label: 'text-[hsl(var(--text-primary))]' },
}

type Risk = keyof typeof RISK_STYLES

function limitRisk(balance: number, creditLimit: number): Risk {
  if (creditLimit <= 0) return 'noLimit'
  if (balance > creditLimit) return 'over'
  if (balance >= creditLimit * NEAR_LIMIT) return 'near'
  return 'ok'
}

export function CounterpartyBalanceWidget({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data, isLoading } = useCounterpartyBalance('Customer')

  function fmt(n: number) {
    return n.toLocaleString('ru-RU') + ' ' + t('dashboard.sum')
  }

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5 animate-pulse', className)}>
        <div className="mb-4 h-4 w-40 rounded bg-[hsl(var(--surface-2))]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-3 h-10 rounded bg-[hsl(var(--surface-2))]" />
        ))}
      </div>
    )
  }

  const debtors = (data?.lines ?? [])
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  const maxBalance = Math.max(...debtors.map((d) => d.balance), 1)

  return (
    <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)}>
      <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{t('dashboard.counterpartyBalance')}</h3>
      <p className="mb-4 mt-0.5 text-[11px] text-[hsl(var(--text-muted))]">{t('dashboard.counterpartyBalanceHint')}</p>
      {debtors.length === 0 ? (
        <p className="text-xs text-[hsl(var(--text-muted))]">{t('dashboard.noDebtors')}</p>
      ) : (
        <div className="space-y-3">
          {debtors.map(({ id, name, balance, creditLimit }, i) => {
            const risk = limitRisk(balance, creditLimit)
            const r = RISK_STYLES[risk]
            const limit = formatCompact(creditLimit)
            const tip =
              risk === 'over' ? t('dashboard.limitOverTip', { limit, amount: formatCompact(balance - creditLimit) })
              : risk === 'near' ? t('dashboard.limitNearTip', { limit, percent: Math.round((balance / creditLimit) * 100) })
              : risk === 'ok' ? t('dashboard.limitOkTip', { limit })
              : t('dashboard.noLimitTip')
            return (
              <div key={id} data-risk={risk} title={tip} className="anim-rise" style={{ '--delay': `${450 + i * 80}ms` } as CSSProperties}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {r.icon}
                    <span className="text-[hsl(var(--text-primary))]">{name}</span>
                  </div>
                  <span className={cn('font-mono tabular-nums', r.label)}>{fmt(balance)}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                  <div
                    className={cn('anim-grow-x h-full rounded-full transition-all duration-500', r.bar)}
                    style={{ width: `${(balance / maxBalance) * 100}%`, '--delay': `${550 + i * 80}ms` } as CSSProperties}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
