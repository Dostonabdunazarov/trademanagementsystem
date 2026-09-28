import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Shield, ChevronLeft, ChevronRight, Filter, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchAuditLogs, type AuditLogsParams } from '@/api/auditLogs'

const PAGE_SIZE = 500

export function AuditLogsPage() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{
    action: string
    dateFrom: string
    dateTo: string
    success: '' | 'true' | 'false'
  }>({ action: '', dateFrom: '', dateTo: '', success: '' })
  const [appliedFilters, setAppliedFilters] = useState(filters)

  const params: AuditLogsParams = {
    page,
    pageSize: PAGE_SIZE,
    ...(appliedFilters.action ? { action: appliedFilters.action } : {}),
    ...(appliedFilters.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
    ...(appliedFilters.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
    ...(appliedFilters.success !== '' ? { success: appliedFilters.success === 'true' } : {}),
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters)
    setPage(1)
  }, [filters])

  const resetFilters = useCallback(() => {
    const empty = { action: '', dateFrom: '', dateTo: '', success: '' as const }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }, [])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-500" strokeWidth={1.8} />
          <h1 className="text-lg font-semibold text-[hsl(var(--text-primary))]">
            {t('auditLogs.title')}
          </h1>
          {data && (
            <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-xs text-[hsl(var(--text-muted))]">
              {data.totalCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            showFilters
              ? 'border-brand-500/40 bg-brand-500/10 text-brand-500'
              : 'border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {t('common.filter')}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[hsl(var(--text-muted))]">{t('auditLogs.action')}</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                placeholder={t('auditLogs.actionPlaceholder')}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs text-[hsl(var(--text-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[hsl(var(--text-muted))]">{t('common.from')}</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs text-[hsl(var(--text-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[hsl(var(--text-muted))]">{t('common.to')}</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs text-[hsl(var(--text-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[hsl(var(--text-muted))]">{t('common.status')}</label>
              <select
                value={filters.success}
                onChange={(e) => setFilters((f) => ({ ...f, success: e.target.value as '' | 'true' | 'false' }))}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1.5 text-xs text-[hsl(var(--text-primary))] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{t('common.all')}</option>
                <option value="true">{t('auditLogs.successOnly')}</option>
                <option value="false">{t('auditLogs.failedOnly')}</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={applyFilters}
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
            >
              {t('reports.apply')}
            </button>
            <button
              onClick={resetFilters}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-4 py-1.5 text-xs font-medium text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[hsl(var(--text-muted))]">
            {t('common.loading')}
          </div>
        ) : isError ? (
          <div className="flex h-40 items-center justify-center text-sm text-red-500">
            {t('common.error')}
          </div>
        ) : !data?.items.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-[hsl(var(--text-muted))]">
            {t('common.noData')}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]">
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))] whitespace-nowrap">{t('common.date')}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))]">{t('auditLogs.user')}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))]">{t('auditLogs.action')}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))]">{t('auditLogs.entity')}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))]">{t('auditLogs.details')}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))] whitespace-nowrap">{t('common.status')}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[hsl(var(--text-muted))] whitespace-nowrap">{t('auditLogs.ip')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((log, i) => (
                <tr
                  key={log.id}
                  className={cn(
                    'border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--surface-2))]',
                    i % 2 === 0 ? '' : 'bg-[hsl(var(--surface))]',
                  )}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap text-[hsl(var(--text-muted))]">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-[hsl(var(--text-primary))] max-w-[160px] truncate">
                    {log.userEmail ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-brand-500/10 px-2 py-0.5 font-mono text-[11px] text-brand-500">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[hsl(var(--text-muted))]">
                    {log.entityType ? (
                      <span>
                        {log.entityType}
                        {log.entityId && <span className="ml-1 text-[hsl(var(--text-muted))]/60">#{log.entityId}</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 max-w-[240px] truncate text-[hsl(var(--text-muted))]" title={log.details ?? undefined}>
                    {log.success === false && log.errorMessage
                      ? <span className="text-red-400">{log.errorMessage}</span>
                      : log.details ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.success ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('auditLogs.ok')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-3.5 w-3.5" />
                        {t('auditLogs.fail')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[hsl(var(--text-muted))]">
                    {log.ipAddress ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && data && data.totalCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[hsl(var(--text-muted))]">
            {t('common.page')} {page} {t('common.of')} {totalPages} · {data.totalCount} {t('common.rows')}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[hsl(var(--border))] p-1.5 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[hsl(var(--border))] p-1.5 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
