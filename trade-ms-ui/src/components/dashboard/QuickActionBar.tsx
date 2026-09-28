import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowUpFromLine, ArrowDownToLine, RotateCcw, RefreshCw, Banknote, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const ACTION_KEYS = [
  { key: 'F1', labelKey: 'dashboard.actionExpense', to: '/expense', icon: ArrowUpFromLine, color: 'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' },
  { key: 'F2', labelKey: 'dashboard.actionIncome', to: '/income', icon: ArrowDownToLine, color: 'hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20' },
  { key: 'F3', labelKey: 'dashboard.actionReturnCustomer', to: '/return-customer', icon: RotateCcw, color: 'hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20' },
  { key: 'F4', labelKey: 'dashboard.actionReturnSupplier', to: '/return-supplier', icon: RefreshCw, color: 'hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20' },
  { key: 'F5', labelKey: 'dashboard.actionPayOut', to: '/pay-out', icon: Banknote, color: 'hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/20' },
  { key: 'F6', labelKey: 'dashboard.actionPayIn', to: '/pay-in', icon: Wallet, color: 'hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/20' },
]

export function QuickActionBar({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const ACTIONS = ACTION_KEYS.map((a) => ({ ...a, label: t(a.labelKey) }))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = ACTIONS.find((a) => a.key === e.key)
      if (action) { e.preventDefault(); navigate(action.to) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-30 -translate-x-1/2',
        'flex items-center gap-1.5 rounded-2xl border border-border bg-card/90 p-2 shadow-2xl shadow-foreground/20 backdrop-blur-xl',
        className,
      )}
    >
      {ACTIONS.map(({ key, label, to, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => navigate(to)}
          title={`${label} (${key})`}
          className={cn(
            'group flex flex-col items-center gap-0.5 rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[hsl(var(--text-muted))] transition-all duration-150',
            color,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
          <span className="text-[9px] font-medium leading-none">{label}</span>
          <span className="text-[8px] font-mono leading-none text-[hsl(var(--text-muted))] group-hover:text-current">{key}</span>
        </button>
      ))}
    </div>
  )
}
