import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowUpFromLine, ArrowDownToLine, RotateCcw, RefreshCw, Banknote, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Горячие клавиши документов. F5 не занимаем: это «обновить страницу» в браузере,
 * поэтому выплата — на F7.
 */
const ACTION_KEYS = [
  { key: 'F1', labelKey: 'dashboard.actionExpense', to: '/expense', icon: ArrowUpFromLine, color: 'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' },
  { key: 'F2', labelKey: 'dashboard.actionIncome', to: '/income', icon: ArrowDownToLine, color: 'hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20' },
  { key: 'F3', labelKey: 'dashboard.actionReturnCustomer', to: '/return-customer', icon: RotateCcw, color: 'hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20' },
  { key: 'F4', labelKey: 'dashboard.actionReturnSupplier', to: '/return-supplier', icon: RefreshCw, color: 'hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20' },
  { key: 'F6', labelKey: 'dashboard.actionPayIn', to: '/pay-in', icon: Wallet, color: 'hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/20' },
  { key: 'F7', labelKey: 'dashboard.actionPayOut', to: '/pay-out', icon: Banknote, color: 'hover:bg-brand-500/10 hover:text-brand-400 hover:border-brand-500/20' },
] as const

/** Фокус в поле ввода или в открытом диалоге — клавиши принадлежат им, а не навигации. */
function shouldIgnore(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.repeat) return true
  if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return true
  const target = e.target instanceof Element ? e.target : null
  const active = document.activeElement
  for (const el of [target, active]) {
    if (!(el instanceof HTMLElement)) continue
    if (el.isContentEditable) return true
    if (el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true
    if (el.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) return true
  }
  // Открытый модальный диалог (фокус может быть и на body после клика по подложке).
  return !!document.querySelector('[role="dialog"], [role="alertdialog"]')
}

export function QuickActionBar({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = ACTION_KEYS.find((a) => a.key === e.key)
      if (!action || shouldIgnore(e)) return
      e.preventDefault()
      navigate(action.to)
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
      role="toolbar"
      aria-label={t('dashboard.quickActions')}
    >
      {ACTION_KEYS.map(({ key, labelKey, to, icon: Icon, color }) => {
        const label = t(labelKey)
        return (
          <button
            type="button"
            key={key}
            onClick={() => navigate(to)}
            title={`${label} (${key})`}
            aria-keyshortcuts={key}
            className={cn(
              'group flex flex-col items-center gap-0.5 rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[hsl(var(--text-muted))] transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              color,
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            <span className="text-[9px] font-medium leading-none">{label}</span>
            <span className="text-[8px] font-mono leading-none text-[hsl(var(--text-muted))] group-hover:text-current" aria-hidden>{key}</span>
          </button>
        )
      })}
    </div>
  )
}
