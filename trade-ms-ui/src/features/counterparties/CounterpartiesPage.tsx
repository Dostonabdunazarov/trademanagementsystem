import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { useCounterparties, type CounterpartyDto } from '@/api/hooks/useCounterparties'
import {
  useCreateCounterparty,
  useUpdateCounterparty,
  useDeleteCounterparty,
  type CreateCounterpartyDto,
} from '@/api/hooks/useCounterpartyMutations'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/apiError'

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteCounterpartyDialog({
  open,
  name,
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean
  name: string
  onConfirm: () => void
  onClose: () => void
  busy: boolean
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border border-white/10 text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('common.delete')}</DialogTitle>
        </DialogHeader>
        <p className="text-[hsl(var(--text-muted))] text-sm mt-1">
          «{name}» — {t('common.confirmDelete')}
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={onConfirm} disabled={busy} className="bg-red-600 hover:bg-red-700">
            {busy ? t('common.loading') : t('common.delete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type FilterType = 'All' | 'Customer' | 'Supplier'

const TYPE_OPTION_KEYS: { value: FilterType; labelKey: string }[] = [
  { value: 'All', labelKey: 'counterparties.allTypes' },
  { value: 'Customer', labelKey: 'counterparties.customers' },
  { value: 'Supplier', labelKey: 'counterparties.suppliers' },
]

// ── Form dialog ────────────────────────────────────────────────────────────────

function CounterpartyFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: CounterpartyDto | null
}) {
  const { t } = useTranslation()
  const create = useCreateCounterparty()
  const update = useUpdateCounterparty()
  const isEdit = !!initial

  // Все поля PUT берутся из initial: поле, которого нет в форме, затёрло бы данные (AUDIT FE-5).
  const [form, setForm] = useState<CreateCounterpartyDto>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'Customer',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    creditLimit: initial?.creditLimit ?? 0,
  })

  function set<K extends keyof CreateCounterpartyDto>(k: K, v: CreateCounterpartyDto[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data: CreateCounterpartyDto = {
      ...form,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial!.id, data })
        toast.success(t('counterparties.updatedSuccess'))
      } else {
        await create.mutateAsync(data)
        toast.success(t('counterparties.createdSuccess'))
      }
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, t, isEdit ? t('counterparties.updateError') : t('counterparties.createError')))
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border border-white/10 text-[hsl(var(--text-primary))] max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('counterparties.editCounterparty') : t('counterparties.newCounterparty')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>{t('counterparties.fullName')} *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('common.type')}</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v as CreateCounterpartyDto['type'])}>
                <SelectTrigger className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10 text-[hsl(var(--text-primary))]">
                  <SelectItem value="Customer">{t('counterparties.Customer')}</SelectItem>
                  <SelectItem value="Supplier">{t('counterparties.Supplier')}</SelectItem>
                  <SelectItem value="Both">{t('counterparties.Both')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('counterparties.phone')}</Label>
              <Input
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+998 __ ___ __ __"
                className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('counterparties.address')}</Label>
            <Input
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.creditLimit')}</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.creditLimit ?? 0}
              onChange={(e) => set('creditLimit', +e.target.value)}
              className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={busy} className="bg-brand-600 hover:bg-brand-700">
              {busy ? t('common.loading') : isEdit ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function balanceColor(balance: number) {
  if (balance > 0) return 'text-emerald-400'
  if (balance < 0) return 'text-red-400'
  return 'text-[hsl(var(--text-muted))]'
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CounterpartiesPage() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const [typeFilter, setTypeFilter] = useState<FilterType>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  const { data, isLoading } = useCounterparties(
    typeFilter === 'All' ? undefined : typeFilter,
    search || undefined,
    page,
    PAGE_SIZE,
  )

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 1

  const [formDialog, setFormDialog] = useState<{ open: boolean; item?: CounterpartyDto | null }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item?: CounterpartyDto }>({ open: false })
  const deleteMut = useDeleteCounterparty()

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item) return
    try {
      await deleteMut.mutateAsync(deleteDialog.item.id)
      toast.success(t('counterparties.deletedSuccess'))
    } catch (err) {
      toast.error(getApiErrorMessage(err, t, t('counterparties.deleteError')))
    } finally {
      setDeleteDialog({ open: false })
    }
  }, [deleteMut, deleteDialog.item, t])

  const items = data?.items ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-card">
        <Input
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))] w-72"
        />

        {/* Type filter tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {TYPE_OPTION_KEYS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTypeFilter(opt.value); setPage(1) }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                typeFilter === opt.value
                  ? 'bg-brand-600 text-brand-fg'
                  : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {data && (
          <span className="text-xs text-[hsl(var(--text-muted))]">
            {data.totalCount} {t('common.rows')}
          </span>
        )}

        {isAdmin && (
          <Button
            onClick={() => setFormDialog({ open: true, item: null })}
            className="bg-brand-600 hover:bg-brand-700 text-brand-fg"
          >
            + {t('counterparties.newCounterparty')}
          </Button>
        )}
      </div>

      {/* Stats bar */}
      {items.length > 0 && (
        <div className="flex gap-6 px-4 py-2 border-b border-white/8 bg-background">
          <StatChip
            label={t('counterparties.debtors')}
            value={items.filter((i) => i.balance > 0).length}
            color="text-emerald-400"
          />
          <StatChip
            label={t('counterparties.creditors')}
            value={items.filter((i) => i.balance < 0).length}
            color="text-red-400"
          />
          <StatChip
            label={t('counterparties.zero')}
            value={items.filter((i) => i.balance === 0).length}
            color="text-[hsl(var(--text-muted))]"
          />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              <TableHead className="text-[hsl(var(--text-muted))] w-10">#</TableHead>
              <TableHead className="text-[hsl(var(--text-muted))]">{t('common.name')}</TableHead>
              <TableHead className="text-[hsl(var(--text-muted))]">{t('common.type')}</TableHead>
              <TableHead className="text-[hsl(var(--text-muted))]">{t('counterparties.phone')}</TableHead>
              <TableHead className="text-[hsl(var(--text-muted))] text-right">{t('counterparties.balance')}</TableHead>
              <TableHead className="text-[hsl(var(--text-muted))] text-right">{t('common.creditLimit')}</TableHead>
              {isAdmin && <TableHead className="text-[hsl(var(--text-muted))] w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-white/8">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-white/5 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-[hsl(var(--text-muted))] py-12">
                  {t('counterparties.noCounterparties')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((c, index) => (
                <TableRow key={c.id} className="border-white/8 hover:bg-white/4 group">
                  <TableCell className="text-[hsl(var(--text-muted))] text-sm tabular-nums">{(page - 1) * PAGE_SIZE + index + 1}</TableCell>
                  <TableCell className="font-medium text-[hsl(var(--text-primary))]">{c.name}</TableCell>
                  <TableCell>
                    <TypeBadge type={c.type} />
                  </TableCell>
                  <TableCell className="text-[hsl(var(--text-muted))] text-sm">{c.phone || '—'}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${balanceColor(c.balance)}`}>
                    {fmt(c.balance)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[hsl(var(--text-muted))]">
                    {c.creditLimit > 0 ? fmt(c.creditLimit) : '—'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                        <button
                          onClick={() => setFormDialog({ open: true, item: c })}
                          className="px-2 py-1 text-xs text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, item: c })}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title={t('common.delete')}
                          aria-label={t('counterparties.deleteNamed', { name: c.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 bg-card">
          <span className="text-xs text-[hsl(var(--text-muted))]">
            {t('common.page')} {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              aria-label={t('documents.prevPage')}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 text-[hsl(var(--text-primary))] hover:bg-white/5"
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              aria-label={t('documents.nextPage')}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 text-[hsl(var(--text-primary))] hover:bg-white/5"
            >
              →
            </Button>
          </div>
        </div>
      )}

      {/* Form dialog */}
      {formDialog.open && (
        <CounterpartyFormDialog
          open={formDialog.open}
          onClose={() => setFormDialog({ open: false })}
          initial={formDialog.item}
        />
      )}

      <DeleteCounterpartyDialog
        open={deleteDialog.open}
        name={deleteDialog.item?.name ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false })}
        busy={deleteMut.isPending}
      />
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  const cfg: Record<string, string> = {
    Customer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Supplier: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Both: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
  }
  const typeLabels: Record<string, string> = {
    Customer: t('counterparties.Customer'),
    Supplier: t('counterparties.Supplier'),
    Both: t('counterparties.Both'),
  }
  return (
    <Badge variant="outline" className={cfg[type] ?? ''}>
      {typeLabels[type] ?? type}
    </Badge>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[hsl(var(--text-muted))]">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
