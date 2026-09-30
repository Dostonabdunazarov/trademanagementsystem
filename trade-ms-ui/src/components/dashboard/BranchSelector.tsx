import { Building2, ChevronDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useBranches } from '@/api/hooks/useBranches'

export function BranchSelector({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { activeBranch, setActiveBranch, clearActiveBranch } = useUiStore()
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: branches, isLoading, isError } = useBranches()

  const isAdmin = user?.role === 'Admin'
  const canChangeBranch = isAdmin

  // Сохранённый activeBranch сверяем с актуальным списком: удалённый филиал или
  // филиал прошлого пользователя не должен уходить в branchId запросов.
  useEffect(() => {
    if (isLoading || isError || !branches) return
    if (isAdmin) {
      const current = activeBranch ? branches.find((b) => b.id === activeBranch.id) : undefined
      if (activeBranch && !current) clearActiveBranch()
      else if (current && current.name !== activeBranch?.name) setActiveBranch(current)
      return
    }
    // Не-Admin всегда работает в своём филиале из токена; без филиала — ничего не выбираем.
    const assigned = user?.branchId ? branches.find((b) => b.id === user.branchId) : undefined
    if (!assigned) {
      if (activeBranch) clearActiveBranch()
    } else if (activeBranch?.id !== assigned.id || activeBranch.name !== assigned.name) {
      setActiveBranch(assigned)
    }
  }, [isLoading, isError, branches, isAdmin, user?.branchId, activeBranch, setActiveBranch, clearActiveBranch])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = activeBranch
  const hasBranches = !isLoading && branches && branches.length > 0

  const displayLabel = isLoading
    ? t('common.loading')
    : selected?.name ?? (isAdmin ? t('branches.all') : t('branches.none'))

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        title={t('branches.select')}
        onClick={() => canChangeBranch && hasBranches && setOpen((v) => !v)}
        disabled={isLoading || !canChangeBranch}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-white/[0.04] px-3 py-1.5 text-sm text-[hsl(var(--text-primary))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          canChangeBranch && hasBranches && 'hover:border-white/[0.15] hover:bg-white/[0.07]',
          !canChangeBranch && 'cursor-default opacity-60',
          isLoading && 'opacity-60',
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-400" />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-400" />
        )}
        <span className="max-w-[140px] truncate">{displayLabel}</span>
        {canChangeBranch && hasBranches && (
          <ChevronDown className={cn('h-3.5 w-3.5 text-[hsl(var(--text-muted))] transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {open && branches && branches.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] rounded-xl border border-border bg-secondary py-1 shadow-2xl shadow-foreground/15">
          {isAdmin && (
            <button
              type="button"
              onClick={() => { clearActiveBranch(); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                selected === null
                  ? 'bg-brand-500/10 text-brand-300 light:text-brand-600'
                  : 'text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]',
              )}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 opacity-40" />
              {t('branches.all')}
            </button>
          )}
          {branches.map((b) => (
            <button
              type="button"
              key={b.id}
              onClick={() => { setActiveBranch(b); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                b.id === selected?.id
                  ? 'bg-brand-500/10 text-brand-300 light:text-brand-600'
                  : 'text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]',
              )}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
