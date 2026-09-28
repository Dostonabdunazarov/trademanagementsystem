import { useState } from 'react'
import { RefreshCw, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useCounterpartyBalance } from '@/api/hooks/useReports'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'Customer', label: 'Клиенты' },
  { value: 'Supplier', label: 'Поставщики' },
]

export function CounterpartyBalanceReport() {
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, refetch, isError } = useCounterpartyBalance(type || undefined)

  const allItems = data?.lines ?? []
  const filtered = allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.phone ?? '').includes(search)
  )

  const debtors = filtered.filter((i) => i.balance > 0)
  const creditors = filtered.filter((i) => i.balance < 0)
  const zeroes = filtered.filter((i) => i.balance === 0)

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <div className="flex rounded-lg border border-[hsl(var(--border))] bg-card p-0.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                type === opt.value
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
          <input
            type="text"
            placeholder="Поиск по имени или телефону…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-[hsl(var(--text-primary))] placeholder:text-slate-600 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
          />
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-2 rounded-lg bg-brand-500/10 px-4 text-sm font-medium text-brand-400 ring-1 ring-brand-500/30 transition-all hover:bg-brand-500/20 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Обновить
        </button>
      </div>

      {/* Summary row */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-5 py-4">
            <p className="text-xs text-emerald-500/70 mb-1">Дебиторы (нам должны)</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-emerald-400">{formatNumber(data.totalDebit)}</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{debtors.length} контрагентов</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-5 py-4">
            <p className="text-xs text-red-500/70 mb-1">Кредиторы (мы должны)</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-red-400">{formatNumber(data.totalCredit)}</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{creditors.length} контрагентов</p>
          </div>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-card px-5 py-4">
            <p className="text-xs text-[hsl(var(--text-muted))] mb-1">Нулевой баланс</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-[hsl(var(--text-muted))]">{zeroes.length}</p>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">контрагентов</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Контрагент</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Тип</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Телефон</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Дебит</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Кредит</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">Баланс</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">Загрузка…</td></tr>
            )}
            {isError && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-red-400">Ошибка загрузки данных</td></tr>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[hsl(var(--text-muted))]">Нет данных</td></tr>
            )}
            {filtered.map((row, idx) => {
              const isDebt = row.balance > 0
              const isCredit = row.balance < 0
              return (
                <tr
                  key={row.id}
                  className={cn('border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--surface-2))]', idx % 2 === 1 && 'bg-white/[0.01]')}
                >
                  <td className="px-4 py-3 font-medium text-[hsl(var(--text-primary))]">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      row.type === 'Customer' ? 'bg-sky-500/10 text-sky-400' :
                      row.type === 'Supplier' ? 'bg-brand-500/10 text-brand-400' :
                      'bg-slate-500/10 text-[hsl(var(--text-muted))]'
                    )}>
                      {row.type === 'Customer' ? 'Клиент' : row.type === 'Supplier' ? 'Поставщик' : 'Оба'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--text-muted))] text-xs">{row.phone || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{formatNumber(row.balance > 0 ? row.balance : 0)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[hsl(var(--text-muted))]">{formatNumber(row.balance < 0 ? Math.abs(row.balance) : 0)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      'inline-flex items-center gap-1 font-mono tabular-nums font-semibold',
                      isDebt ? 'text-emerald-400' : isCredit ? 'text-red-400' : 'text-[hsl(var(--text-muted))]'
                    )}>
                      {isDebt && <ArrowUpRight className="h-3 w-3" />}
                      {isCredit && <ArrowDownRight className="h-3 w-3" />}
                      {formatNumber(Math.abs(row.balance))}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
