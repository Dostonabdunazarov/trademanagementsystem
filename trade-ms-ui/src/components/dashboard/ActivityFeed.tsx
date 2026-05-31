import { ArrowUpFromLine, ArrowDownToLine, RotateCcw, Banknote, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useDocuments } from '@/api/hooks/useDocuments'
import { formatNumber } from '@/utils/format'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Expense: <ArrowUpFromLine className="h-3.5 w-3.5" />,
  Income: <ArrowDownToLine className="h-3.5 w-3.5" />,
  ReturnFromCustomer: <RotateCcw className="h-3.5 w-3.5" />,
  ReturnToSupplier: <RotateCcw className="h-3.5 w-3.5" />,
  PayOut: <Banknote className="h-3.5 w-3.5" />,
  PayIn: <Wallet className="h-3.5 w-3.5" />,
}

const INCOME_TYPES = new Set(['Income', 'ReturnFromCustomer', 'PayIn'])

function formatTime(createdAt: string | null | undefined) {
  if (!createdAt) return '—'
  const d = new Date(createdAt)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function ActivityFeed({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data, isLoading } = useDocuments({ page: 1, pageSize: 10 })

  const TYPE_LABELS: Record<string, string> = {
    Expense: t('dashboard.typeExpense'),
    Income: t('dashboard.typeIncome'),
    ReturnFromCustomer: t('dashboard.typeReturnFromCustomer'),
    ReturnToSupplier: t('dashboard.typeReturnToSupplier'),
    PayOut: t('dashboard.typePayOut'),
    PayIn: t('dashboard.typePayIn'),
  }

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5 animate-pulse', className)}>
        <div className="mb-4 h-4 w-32 rounded bg-[hsl(var(--surface-2))]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3 h-8 rounded bg-[hsl(var(--surface-2))]" />
        ))}
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div className={cn('rounded-xl border border-[hsl(var(--border))] bg-card p-5', className)}>
      <h3 className="mb-4 text-sm font-semibold text-[hsl(var(--text-primary))]">{t('dashboard.recentActivity')}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-[hsl(var(--text-muted))]">{t('dashboard.noActivity')}</p>
      ) : (
        <div className="space-y-1">
          {items.map((doc) => {
            const positive = INCOME_TYPES.has(doc.type)
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[hsl(var(--surface-2))]"
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400',
                  )}
                >
                  {TYPE_ICONS[doc.type] ?? <ArrowUpFromLine className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-[hsl(var(--text-primary))]">{TYPE_LABELS[doc.type] ?? doc.type}</p>
                  <p className="truncate text-[10px] text-[hsl(var(--text-muted))]">{doc.counterpartyName ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className={cn('font-mono text-xs tabular-nums', positive ? 'text-emerald-400' : 'text-[hsl(var(--text-primary))]')}>
                    {positive ? '+' : ''}{formatNumber(doc.totalAmountBase)}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--text-muted))]">{formatTime(doc.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
