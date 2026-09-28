import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { uz } from 'date-fns/locale'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useDocuments } from '@/api/hooks/useDocuments'
import { useDeleteDocument, useConfirmDocument } from '@/api/hooks/useDocumentMutations'
import { useUiStore } from '@/store/ui.store'

const PAGE_SIZE = 100

const STATUS_ICONS: Record<string, React.ElementType> = {
  Draft: Clock,
  Confirmed: CheckCircle,
  Cancelled: XCircle,
}
const STATUS_CLS: Record<string, string> = {
  Draft: 'text-amber-400 bg-amber-400/10',
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
  const dateLocale = language === 'uz' ? uz : ru
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => { setPage(1) }, [activeBranch?.id])

  const { data, isFetching } = useDocuments({
    type,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: statusFilter || undefined,
    branchId: activeBranch?.id,
    page,
    pageSize: PAGE_SIZE,
  })

  const deleteMut = useDeleteDocument()
  const confirmMut = useConfirmDocument()

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const filtered = search.trim()
    ? items.filter(
        (d) =>
          d.number.toLowerCase().includes(search.toLowerCase()) ||
          (d.counterpartyName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : items

  const handleDelete = useCallback(
    async (id: number) => {
      setDeletingId(id)
      try {
        await deleteMut.mutateAsync(id)
        toast.success(t('common.success'))
      } catch {
        toast.error(t('common.error'))
      } finally {
        setDeletingId(null)
      }
    },
    [deleteMut, t],
  )

  const handleConfirm = useCallback(
    async (id: number) => {
      setConfirmingId(id)
      try {
        await confirmMut.mutateAsync(id)
        toast.success(t('documents.confirmed'))
      } catch {
        toast.error(t('common.error'))
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
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('common.search') + '...'}
            className="w-full rounded-lg border border-border bg-secondary pl-9 pr-3 py-2 text-sm text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))] transition-colors',
            showFilters && 'border-brand-500/40 text-brand-500',
          )}
        >
          <Filter className="h-4 w-4" />
          {t('common.filter')}
          {(dateFrom || dateTo || statusFilter) && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-semibold text-white">
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('documents.filterByDateTo')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[hsl(var(--text-muted))] uppercase tracking-wider">{t('documents.filterByStatus')}</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-[hsl(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              <option value="">{t('documents.allStatuses')}</option>
              <option value="Draft">{t('status.Draft')}</option>
              <option value="Confirmed">{t('status.Confirmed')}</option>
              <option value="Cancelled">{t('status.Cancelled')}</option>
            </select>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[hsl(var(--text-muted))]">
                  {isFetching ? t('common.loading') : t('documents.noDocuments')}
                </td>
              </tr>
            )}
            {filtered.map((doc) => (
              <tr
                key={doc.id}
                className="group cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
                onClick={() => navigate(`${createPath}?id=${doc.id}`)}
              >
                <td className="px-4 py-3 font-mono text-xs text-brand-400 font-medium">
                  {doc.number}
                </td>
                <td className="px-4 py-3 text-[hsl(var(--text-muted))] whitespace-nowrap">
                  {doc.date
                    ? format(new Date(doc.date), 'dd MMM yyyy', { locale: dateLocale })
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.status === 'Draft' && (
                      <>
                        <button
                          onClick={() => handleConfirm(doc.id)}
                          disabled={confirmingId === doc.id}
                          title={t('common.confirm')}
                          className="rounded-md p-1.5 text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          title={t('common.delete')}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
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
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'h-7 min-w-[28px] rounded-md px-1 text-xs font-medium transition-colors',
                    n === page
                      ? 'bg-brand-500/20 text-brand-500'
                      : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                  )}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md p-1.5 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
