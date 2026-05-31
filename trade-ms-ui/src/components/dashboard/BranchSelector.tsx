import { Building2, ChevronDown, Loader2 } from 'lucide-react'
import { useUiStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useBranches } from '@/api/hooks/useBranches'
import type { BranchDto } from '@/api/branches'

export function BranchSelector({ className }: { className?: string }) {
  const { activeBranch, setActiveBranch, clearActiveBranch } = useUiStore()
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: branches, isLoading } = useBranches()

  const isAdmin = user?.role === 'Admin'
  const canChangeBranch = isAdmin

  useEffect(() => {
    if (isLoading) return
    if (!branches || branches.length === 0) {
      clearActiveBranch()
      return
    }
    if (!isAdmin) {
      // Non-admins are locked to their assigned branch from the token
      const assignedBranch = user?.branchId
        ? branches.find((b) => b.id === user.branchId) ?? branches[0]
        : branches[0]
      setActiveBranch(assignedBranch)
    } else if (!activeBranch) {
      // Admin starts with no branch selected (null = "Все филиалы")
    }
  }, [isLoading, branches, isAdmin, user?.branchId, setActiveBranch, clearActiveBranch, activeBranch])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = activeBranch as BranchDto | null
  const hasBranches = !isLoading && branches && branches.length > 0

  const displayLabel = isLoading
    ? 'Загрузка...'
    : selected?.name ?? (isAdmin ? 'Все филиалы' : 'Нет филиалов')

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => canChangeBranch && hasBranches && setOpen((v) => !v)}
        disabled={isLoading || !canChangeBranch}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-white/[0.04] px-3 py-1.5 text-sm text-[hsl(var(--text-primary))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          canChangeBranch && hasBranches && 'hover:border-white/[0.15] hover:bg-white/[0.07]',
          !canChangeBranch && 'cursor-default opacity-60',
          isLoading && 'opacity-60',
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-400" />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
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
              onClick={() => { clearActiveBranch(); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                selected === null
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                  : 'text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]',
              )}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 opacity-40" />
              Все филиалы
            </button>
          )}
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => { setActiveBranch(b); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                b.id === selected?.id
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
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
