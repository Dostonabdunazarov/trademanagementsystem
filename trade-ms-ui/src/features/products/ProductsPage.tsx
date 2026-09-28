import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { useProducts } from '@/api/hooks/useProducts'
import { useProductGroups, type ProductGroupDto } from '@/api/hooks/useProductGroups'
import { useCurrencies } from '@/api/hooks/useCurrencies'
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateProductGroup,
  type CreateProductDto,
} from '@/api/hooks/useProductMutations'
import type { ProductDto } from '@/api/hooks/useProducts'
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

const UNIT_KEYS = ['Pcs', 'Kg', 'M', 'M2', 'M3', 'Litre'] as const

// ── Group tree ────────────────────────────────────────────────────────────────

function GroupNode({
  group,
  depth,
  selected,
  onSelect,
}: {
  group: ProductGroupDto
  depth: number
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = group.children && group.children.length > 0
  const isSelected = selected === group.id

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg mx-1 cursor-pointer text-sm transition-all duration-150 ${
          isSelected
            ? 'bg-brand-500/15 text-brand-300 light:text-brand-600 font-semibold shadow-sm shadow-brand-500/10'
            : 'text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))]'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(isSelected ? null : group.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
            className="w-4 h-4 flex items-center justify-center text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]"
          >
            {open ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="truncate">{group.name}</span>
      </div>
      {open && hasChildren &&
        group.children!.map((child) => (
          <GroupNode
            key={child.id}
            group={child}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}

// ── Product form dialog ────────────────────────────────────────────────────────

interface ProductFormProps {
  open: boolean
  onClose: () => void
  initial?: ProductDto | null
  groupId?: string | null
  groups: ProductGroupDto[]
  currencyId: string
}

function ProductFormDialog({ open, onClose, initial, groupId, groups, currencyId }: ProductFormProps) {
  const { t } = useTranslation()
  const { data: currencies } = useCurrencies()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const isEdit = !!initial

  const buildForm = (): CreateProductDto => ({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    unit: initial?.unit || 'Pcs',
    priceSell: initial?.priceSell ?? 0,
    priceBuy: initial?.priceBuy ?? 0,
    currencyId: initial?.currencyId ?? currencyId,
    groupId: initial?.groupId ?? groupId ?? null,
    isActive: initial?.isActive ?? true,
  })

  const [form, setForm] = useState<CreateProductDto>(buildForm)

  useEffect(() => {
    if (open) setForm(buildForm())
  }, [open, initial?.id])

  const flat = flattenGroups(groups)

  function set<K extends keyof CreateProductDto>(k: K, v: CreateProductDto[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial!.id, data: form })
        toast.success(t('products.updatedSuccess'))
      } else {
        await create.mutateAsync(form)
        toast.success(t('products.createdSuccess'))
      }
      onClose()
    } catch (err) {
      console.error('Product save error:', err)
      toast.error(getApiErrorMessage(err, t, isEdit ? t('products.updateError') : t('products.createError')))
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border border-white/10 text-[hsl(var(--text-primary))] max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('products.editProduct') : t('products.newProduct')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>{t('products.productName')} *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('products.sku')}</Label>
              <Input
                value={form.sku ?? ''}
                onChange={(e) => set('sku', e.target.value)}
                className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('products.unit')}</Label>
              <Select value={form.unit || 'Pcs'} onValueChange={(v) => set('unit', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]">
                  <SelectValue className="text-[hsl(var(--text-primary))]" placeholder={t('products.unit')} />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10 text-[hsl(var(--text-primary))]">
                  {UNIT_KEYS.map((u) => (
                    <SelectItem key={u} value={u}>{t(`products.units.${u}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('products.priceSell')}</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.priceSell}
                onChange={(e) => set('priceSell', +e.target.value)}
                className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('products.priceBuy')}</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.priceBuy}
                onChange={(e) => set('priceBuy', +e.target.value)}
                className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('common.currency')}</Label>
              <Select value={form.currencyId} onValueChange={(v) => set('currencyId', v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]">
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10 text-[hsl(var(--text-primary))]">
                  {currencies?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('products.group')}</Label>
              <Select
                value={form.groupId ?? '__none__'}
                onValueChange={(v) => set('groupId', v === '__none__' ? null : v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]">
                  <SelectValue placeholder="Без группы" />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-white/10 text-[hsl(var(--text-primary))]">
                  <SelectItem value="__none__">— Без группы —</SelectItem>
                  {flat.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="accent-brand-500"
            />
            <Label htmlFor="isActive">{t('common.active')}</Label>
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

// ── Group form dialog ──────────────────────────────────────────────────────────

function GroupFormDialog({
  open,
  onClose,
  groups,
}: {
  open: boolean
  onClose: () => void
  groups: ProductGroupDto[]
}) {
  const { t } = useTranslation()
  const create = useCreateProductGroup()
  const flat = flattenGroups(groups)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({ name, parentId })
      toast.success(t('products.groupCreatedSuccess'))
      setName('')
      setParentId(null)
      onClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, t, t('products.createError')))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border border-white/10 text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('products.newGroup')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>{t('products.groupName')} *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]"
            />
          </div>
          <div className="space-y-1">
            <Label>Родительская группа</Label>
            <Select value={parentId ?? '__none__'} onValueChange={(v) => setParentId(v === '__none__' ? null : v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))]">
                <SelectValue placeholder="Корневая" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-white/10 text-[hsl(var(--text-primary))]">
                <SelectItem value="__none__">— Корневая —</SelectItem>
                {flat.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={create.isPending} className="bg-brand-600 hover:bg-brand-700">
              {create.isPending ? t('common.loading') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteDialog({
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
          <DialogTitle>{t('products.deleteProduct')}</DialogTitle>
        </DialogHeader>
        <p className="text-[hsl(var(--text-muted))] text-sm mt-1">
          «{name}» — {t('products.deleteProductDesc')}
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenGroups(
  groups: ProductGroupDto[],
  depth = 0,
  result: { id: string; label: string }[] = [],
): { id: string; label: string }[] {
  for (const g of groups) {
    result.push({ id: g.id, label: '  '.repeat(depth) + g.name })
    if (g.children?.length) flattenGroups(g.children, depth + 1, result)
  }
  return result
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  function selectGroup(id: string | null) {
    setSelectedGroup(id)
    setPage(1)
  }
  const PAGE_SIZE = 500

  const { data: groups = [], isLoading: groupsLoading } = useProductGroups()
  const { data, isLoading } = useProducts({
    search: search || undefined,
    groupId: selectedGroup,
    page,
    pageSize: PAGE_SIZE,
  })
  const { data: currencies } = useCurrencies()
  const deleteProduct = useDeleteProduct()

  const [productDialog, setProductDialog] = useState<{ open: boolean; item?: ProductDto | null }>({ open: false })
  const [groupDialog, setGroupDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item?: ProductDto }>({ open: false })

  const baseCurrencyId = currencies?.find((c) => c.isBase)?.id ?? ''
  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 1

  function currencyCode(id: string) {
    return currencies?.find((c) => c.id === id)?.code ?? '—'
  }

  async function handleDelete() {
    if (!deleteDialog.item) return
    try {
      await deleteProduct.mutateAsync(deleteDialog.item.id)
      toast.success(t('products.deletedSuccess'))
    } catch (err) {
      toast.error(getApiErrorMessage(err, t, t('products.deleteError')))
    } finally {
      setDeleteDialog({ open: false })
    }
  }

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar — группы */}
      <div className="w-56 shrink-0 border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--surface))]">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[hsl(var(--border))]">
          <span className="text-xs font-bold text-[hsl(var(--text-muted))] uppercase tracking-widest">{t('products.group')}</span>
          {isAdmin && (
            <button
              onClick={() => setGroupDialog(true)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-brand-500/15 text-brand-400 light:text-brand-600 hover:bg-brand-500 hover:text-brand-fg transition-all duration-150 text-base leading-none font-bold"
              title={t('products.createGroup')}
            >
              +
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {groupsLoading ? (
            <p className="text-[hsl(var(--text-muted))] text-xs px-3 py-2">{t('common.loading')}</p>
          ) : (
            <>
              <div
                className={`px-3 py-1.5 text-sm rounded-lg mx-1 cursor-pointer transition-all duration-150 ${
                  selectedGroup === null
                    ? 'text-brand-300 light:text-brand-600 bg-brand-500/15 font-semibold shadow-sm shadow-brand-500/10'
                    : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))]'
                }`}
                onClick={() => selectGroup(null)}
              >
                {t('products.allGroups')}
              </div>
              {groups.map((g) => (
                <GroupNode
                  key={g.id}
                  group={g}
                  depth={0}
                  selected={selectedGroup}
                  onSelect={selectGroup}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-card">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="bg-white/5 border-white/10 text-[hsl(var(--text-primary))] w-72 light:bg-brand-50/70 light:border-brand-200"
          />
          <div className="flex-1" />
          {isAdmin && (
            <Button
              onClick={() => setProductDialog({ open: true, item: null })}
              className="btn-primary-gradient bg-brand-600 hover:bg-brand-700 text-brand-fg transition-all duration-200"
            >
              + {t('products.newProduct')}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[hsl(var(--border))] hover:bg-transparent">
                <TableHead className="text-[hsl(var(--text-muted))] w-10 py-2.5 text-xs font-semibold uppercase tracking-wider">#</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] py-2.5 text-xs font-semibold uppercase tracking-wider">{t('common.name')}</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] py-2.5 text-xs font-semibold uppercase tracking-wider">SKU</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] py-2.5 text-xs font-semibold uppercase tracking-wider">{t('products.unit')}</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] text-right py-2.5 text-xs font-semibold uppercase tracking-wider">{t('products.priceSell')}</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] text-right py-2.5 text-xs font-semibold uppercase tracking-wider">{t('products.priceBuy')}</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] py-2.5 text-xs font-semibold uppercase tracking-wider">{t('common.currency')}</TableHead>
                <TableHead className="text-[hsl(var(--text-muted))] py-2.5 text-xs font-semibold uppercase tracking-wider">{t('common.status')}</TableHead>
                {isAdmin && <TableHead className="text-[hsl(var(--text-muted))] w-20 py-2.5" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-white/8">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j} className="py-1.5">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-[hsl(var(--text-muted))] py-12">
                    {t('products.noProducts')}
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((p, idx) => (
                  <TableRow key={p.id} className="border-[hsl(var(--border))] hover:bg-white/4 group transition-colors">
                    <TableCell className="py-2 text-[hsl(var(--text-muted))] text-xs tabular-nums font-medium">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                    <TableCell className="py-2 text-[hsl(var(--text-primary))]">{p.name}</TableCell>
                    <TableCell className="py-2 font-mono text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 light:text-brand-500">
                        {p.sku || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 light:text-brand-600 text-xs font-medium">
                        {t(`products.units.${p.unit}`, p.unit)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-[hsl(var(--text-primary))]">{fmt(p.priceSell)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-[hsl(var(--text-muted))]">{fmt(p.priceBuy)}</TableCell>
                    <TableCell className="py-2">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold">
                        {currencyCode(p.currencyId)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={p.isActive ? 'default' : 'secondary'}
                        className={
                          p.isActive
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 font-medium shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }
                      >
                        {p.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setProductDialog({ open: true, item: p })}
                            className="px-2 py-1 text-xs text-brand-400 light:text-brand-600 hover:text-brand-fg hover:bg-brand-500 rounded transition-all duration-150"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => setDeleteDialog({ open: true, item: p })}
                            className="px-2 py-1 text-xs text-red-500 hover:text-white hover:bg-red-500 rounded transition-all duration-150"
                          >
                            {t('common.delete')}
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
        {data && data.totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/8 bg-card">
            <span className="text-xs text-[hsl(var(--text-muted))]">
              {t('common.total')}: {data.totalCount}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]"
              >
                ←
              </Button>
              <span className="px-3 py-1 text-sm text-[hsl(var(--text-muted))]">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]"
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {productDialog.open && (
        <ProductFormDialog
          open={productDialog.open}
          onClose={() => setProductDialog({ open: false })}
          initial={productDialog.item}
          groupId={selectedGroup}
          groups={groups}
          currencyId={baseCurrencyId}
        />
      )}

      <GroupFormDialog
        open={groupDialog}
        onClose={() => setGroupDialog(false)}
        groups={groups}
      />

      <DeleteDialog
        open={deleteDialog.open}
        name={deleteDialog.item?.name ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false })}
        busy={deleteProduct.isPending}
      />
    </div>
  )
}
