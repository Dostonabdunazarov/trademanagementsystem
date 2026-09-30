import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ru, uz } from 'date-fns/locale'
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDocuments } from '@/api/hooks/useDocuments'
import { useDeleteDocument, useConfirmDocument, useCancelDocument } from '@/api/hooks/useDocumentMutations'
import type { DocumentListItem } from '@/api/hooks/useDocuments'
import { useUiStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

const PAGE_SIZE = 100

/** Кнопки действий строки: мышью — при наведении, на тач-экранах и с клавиатуры — всегда. */
const ROW_ACTIONS_CLS =
  'flex items-center gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'

const STATUS_ICONS: Record<string, React.ElementType> = {
  Draft: Clock,
  Confirmed: CheckCircle,
  Cancelled: XCircle,
}
const STATUS_CLS: Record<string, string> = {
  Draft: 'text-orange-400 bg-orange-400/10',
  Confirmed: 'text-emerald-400 bg-emerald-400/10',
  Cancelled: 'text-red-400 bg-red-400/10',
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const Icon = STATUS_ICONS[status] ?? Clock
  const cls = STATUS_CLS[status] ?? 'text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-2))]'
  const label = t(`status.${status}`, { defaultValue: status })
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', cls)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function fmt(amount: number, code?: string) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) +
    (code ? ' ' + code : '')
}

export interface DocumentsListPageProps {
  type: string
  title: string
  createPath: string
}

export function DocumentsListPage({ type, title, createPath }: DocumentsListPageProps) {
  const { t } = useTranslation()
  const { language, activeBranch } = useUiStore()
  const role = useAuthStore((s) => s.user?.role)
  const canCancel = role === 'Admin' || role === 'Manager'
  const dateLocale = language === 'uz' ? uz : ru
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DocumentListItem | null>(null)
  const [pendingCancel, setPendingCancel] = useState<DocumentListItem | null>(null)

  // Смена филиала или поиска возвращает на первую страницу.
  const [pageKey, setPageKey] = useState(`${activeBranch?.id ?? ''}|${debouncedSearch}`)
  const currentKey = `${activeBranch?.id ?? ''}|${debouncedSearch}`
  if (pageKey !== currentKey) {
    setPageKey(currentKey)
    setPage(1)
  }

  const { data, isFetching } = useDocuments({
    type,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: statusFilter || undefined,
    branchId: activeBranch?.id,
    // Поиск по номеру и контрагенту — на сервере, по всем страницам.
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const deleteMut = useDeleteDocument()
  const confirmMut = useConfirmDocument()
  const cancelMut = useCancelDocument()

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    try {
      await deleteMut.mutateAsync(pendingDelete.id)
      toast.success(t('documents.deleted'))
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    } finally {
      setPendingDelete(null)
    }
  }, [deleteMut, pendingDelete, t])

  const handleCancel = useCallback(async () => {
    if (!pendingCancel) return
    try {
      await cancelMut.mutateAsync(pendingCancel.id)
      toast.success(t('documents.cancelled'))
    } catch (err) {
      toast.error(getApiErrorMessage(err, t))
    } finally {
      setPendingCancel(null)
    }
  }, [cancelMut, pendingCancel, t])

  const handleConfirm = useCallback(
    async (id: number) => {
      setConfirmingId(id)
      try {
        await confirmMut.mutateAsync(id)
        toast.success(t('documents.confirmed'))
      } catch (err) {
        toast.error(getApiErrorMessage(err, t))
      } finally {
        setConfirmingId(null)
      }
    },
    [confirmMut, t],
  )

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[hsl(var(--text-primary))]">{title}</h1>
          <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{totalCount} {t('common.rows')}</p>
        </div>
        <button
          onClick={() => navigate(createPath)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-brand-fg hover:bg-brand-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Plus className="h-4 w-4" />
          {t('documents.createNew')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--text-muted))] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('documents.searchPlaceholder')}
            aria-label={t('common.search')}
            className="w-full rounded-lg border border-border bg-secondary pl-9 pr-3 py-2 text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow"
          />
        </div>
        <button
          type="button"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))] transition-colors',
            showFilters && 'border-brand-500/40 text-brand-400 light:text-brand-600',
          )}
        >
          <Filter className="h-4 w-4" />
          {t('common.filter')}
          {(dateFrom || dateTo || statusFilter) && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-semibold text-brand-fg">
              {[dateFrom, dateTo, statusFilter].filter(Boolean).length}
            </span>
          )}
        </button>
        {isFetching && (
          <div className="flex items-center gap-1.5 px-2 text-xs text-[hsl(var(--text-muted))]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {t('common.loading')}
          </div>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-secondary p-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('documents.filterByDate')}</label>
            <DatePicker
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(v) => { setDateFrom(v); setPage(1) }}
              clearable
              className="h-[34px] bg-card text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('documents.filterByDateTo')}</label>
            <DatePicker
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(v) => { setDateTo(v); setPage(1) }}
              clearable
              className="h-[34px] bg-card text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('documents.filterByStatus')}</label>
            {/* Radix Select не допускает пустое значение — «все» кодируем как 'all'. */}
            <Select
              value={statusFilter || 'all'}
              onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}
            >
              <SelectTrigger className="h-[34px] min-w-[10rem] bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('documents.allStatuses')}</SelectItem>
                <SelectItem value="Draft">{t('status.Draft')}</SelectItem>
                <SelectItem value="Confirmed">{t('status.Confirmed')}</SelectItem>
                <SelectItem value="Cancelled">{t('status.Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || statusFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setPage(1) }}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[hsl(var(--border))] bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] text-left">
              {[t('documents.number'), t('documents.docDate'), t('documents.counterpartyCol'), t('documents.sumTotal'), t('common.currency'), t('common.status'), ''].map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--text-muted))]">
                  {isFetching ? t('common.loading') : t('documents.noDocuments')}
                </td>
              </tr>
            )}
            {items.map((doc) => (
              <tr
                key={doc.id}
                tabIndex={0}
                className="group cursor-pointer hover:bg-[hsl(var(--surface-2))] focus-visible:bg-[hsl(var(--surface-2))] focus-visible:outline-none transition-colors"
                onClick={() => navigate(`${createPath}?id=${doc.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget) navigate(`${createPath}?id=${doc.id}`)
                }}
              >
                <td className="px-4 py-3 font-mono text-xs text-brand-400 font-medium">
                  {doc.number}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--text-muted))] whitespace-nowrap">
                  {doc.date
                    ? format(parseISO(doc.date), 'dd MMM yyyy', { locale: dateLocale })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--text-primary))] max-w-[200px] truncate">
                  {doc.counterpartyName ?? <span className="text-[hsl(var(--text-muted))]">—</span>}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-[hsl(var(--text-primary))] whitespace-nowrap">
                  {fmt(doc.totalAmount)}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--text-muted))]">
                  {doc.currencyCode}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={ROW_ACTIONS_CLS}>
                    {doc.status === 'Draft' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConfirm(doc.id)}
                          disabled={confirmingId === doc.id}
                          title={t('common.confirm')}
                          aria-label={t('documents.confirmDocument', { number: doc.number })}
                          className="rounded-md p-1.5 text-emerald-500 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-colors disabled:opacity-40"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(doc)}
                          title={t('common.delete')}
                          aria-label={t('documents.deleteDocument', { number: doc.number })}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {doc.status === 'Confirmed' && canCancel && (
                      <button
                        type="button"
                        onClick={() => setPendingCancel(doc)}
                        title={t('documents.cancelDocument')}
                        aria-label={t('documents.cancelDocumentTitle', { number: doc.number })}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-1">
          <p className="text-xs text-[hsl(var(--text-muted))]">
            {t('common.page')} {page} {t('common.of')} {totalPages} · {t('common.total')} {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('documents.prevPage')}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md p-1.5 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const n = start + i
              return (
                <button
                  type="button"
                  key={n}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => setPage(n)}
                  className={cn(
                    'h-7 min-w-[28px] rounded-md px-1 text-xs font-medium transition-colors',
                    n === page
                      ? 'bg-brand-500/20 text-brand-400 light:text-brand-600'
                      : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                  )}
                >
                  {n}
                </button>
              )
            })}
            <button
              type="button"
              aria-label={t('documents.nextPage')}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md p-1.5 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        title={t('documents.deleteDocument', { number: pendingDelete?.number ?? '' })}
        description={t('documents.deleteConfirm')}
        confirmLabel={t('common.delete')}
        busy={deleteMut.isPending}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        open={pendingCancel != null}
        title={t('documents.cancelDocumentTitle', { number: pendingCancel?.number ?? '' })}
        description={t('documents.cancelDocumentDesc')}
        confirmLabel={t('documents.cancelDocument')}
        busy={cancelMut.isPending}
        onConfirm={handleCancel}
        onClose={() => setPendingCancel(null)}
      />
    </div>
  )
}
