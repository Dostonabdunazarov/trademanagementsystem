import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2, ChevronDown, ChevronRight, Search, Save, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { DocumentType } from '@/types/document'
import { useDocumentForm } from './useDocumentForm'
import { QuantityDialog } from './QuantityDialog'
import { useProductGroups } from '@/api/hooks/useProductGroups'
import type { ProductGroupDto } from '@/api/hooks/useProductGroups'
import { useProducts } from '@/api/hooks/useProducts'
import type { ProductDto } from '@/api/hooks/useProducts'
import { useCounterparties } from '@/api/hooks/useCounterparties'
import { useCurrencies } from '@/api/hooks/useCurrencies'
import { useCreateDocument, useUpdateDocument, useConfirmDocument } from '@/api/hooks/useDocumentMutations'
import { useDocument } from '@/api/hooks/useDocument'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { useStockBalance } from '@/api/hooks/useReports'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function counterpartyTypeFor(type: DocumentType): 'Customer' | 'Supplier' {
  return type === 'Income' || type === 'ReturnToSupplier' || type === 'PayIn'
    ? 'Supplier'
    : 'Customer'
}

function defaultPriceFor(type: DocumentType, product: ProductDto): number {
  return type === 'Income' || type === 'ReturnToSupplier'
    ? product.priceBuy
    : product.priceSell
}

/* ─── Toast ───────────────────────────────────────────────────────────────── */

interface ToastState {
  message: string
  type: 'success' | 'error'
}

/* ─── Product Group Tree ──────────────────────────────────────────────────── */

interface GroupTreeProps {
  groups: ProductGroupDto[]
  activeGroupId: string | null
  onSelect: (id: string) => void
  level?: number
}

function GroupTree({ groups, activeGroupId, onSelect, level = 0 }: GroupTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  return (
    <ul className="flex flex-col">
      {groups.map((g) => (
        <li key={g.id}>
          <button
            onClick={() => {
              if (g.children?.length) toggle(g.id)
              onSelect(g.id)
            }}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              activeGroupId === g.id
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
            )}
            style={{ paddingLeft: `${(level + 1) * 8}px` }}
          >
            {g.children?.length ? (
              expanded[g.id]
                ? <ChevronDown className="h-3 w-3 shrink-0" />
                : <ChevronRight className="h-3 w-3 shrink-0" />
            ) : (
              <span className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{g.name}</span>
          </button>
          {!!g.children?.length && expanded[g.id] && (
            <GroupTree
              groups={g.children}
              activeGroupId={activeGroupId}
              onSelect={onSelect}
              level={level + 1}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[hsl(var(--surface-2))]', className)} />
}

function DocumentFormSkeleton() {
  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 flex-1" />)}
      </div>
      <div className="flex flex-1 gap-3 min-h-0">
        <Skeleton className="w-[30%] h-full" />
        <Skeleton className="flex-1 h-full" />
      </div>
    </div>
  )
}

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface DocumentFormProps {
  type: DocumentType
  title: string
  className?: string
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export function DocumentForm({ type, title, className }: DocumentFormProps) {
  const { t } = useTranslation()
  const form = useDocumentForm(type)
  const { state } = form

  // Load existing document from URL ?id=
  const [searchParams] = useSearchParams()
  const urlId = searchParams.get('id')
  const editId = urlId ? parseInt(urlId, 10) : null
  const { data: existingDoc, isLoading: docLoading } = useDocument(editId)
  const formLoaded = useRef(false)

  useEffect(() => {
    if (!existingDoc || formLoaded.current) return
    form.setDate(existingDoc.date.slice(0, 10))
    if (existingDoc.counterpartyId) form.setCounterparty(existingDoc.counterpartyId, existingDoc.counterpartyName ?? '')
    form.setCurrency(existingDoc.currencyId, existingDoc.currencyCode, existingDoc.exchangeRate)
    form.setDiscount(existingDoc.discountPercent)
    form.setNote(existingDoc.note ?? '')
    for (const l of existingDoc.lines) {
      form.addLine(
        { id: l.productId, name: l.productName, unit: l.unit },
        l.quantity, l.price, l.discountPercent,
      )
    }
    formLoaded.current = true
  }, [existingDoc]) // eslint-disable-line react-hooks/exhaustive-deps

  const isReadonly = !!existingDoc && existingDoc.status !== 'Draft'

  // API data
  const { data: groupsData, isLoading: groupsLoading } = useProductGroups()
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const { data: productsData, isLoading: productsLoading } = useProducts({
    groupId: activeGroupId,
    search: productSearch || undefined,
    pageSize: 1000,
  })

  const cpType = counterpartyTypeFor(type)
  const [cpSearch, setCpSearch] = useState('')
  const { data: cpData } = useCounterparties(cpType, cpSearch || undefined)
  const [cpOpen, setCpOpen] = useState(false)
  const cpRef = useRef<HTMLDivElement>(null)

  const { data: currencies, isLoading: currenciesLoading } = useCurrencies()

  // Admin branch selection
  const { user } = useAuthStore()
  const { activeBranch } = useUiStore()
  const isAdmin = user?.role === 'Admin'
  const adminNoBranch = isAdmin && !activeBranch

  // Stock check for outbound document types; also show stock for Income
const { data: stockData } = useStockBalance(activeBranch?.id)
  const stockByProductId = (stockData?.lines ?? []).reduce<Map<string, number>>((map, l) => {
    map.set(l.productId, (map.get(l.productId) ?? 0) + l.quantity)
    return map
  }, new Map())

  // Mutations
  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const confirmDoc = useConfirmDocument()

  // Saved document id (after first save as Draft, or pre-filled from URL)
  const [savedDocId, setSavedDocId] = useState<number | null>(editId)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Product dialog
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Close counterparty dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cpRef.current && !cpRef.current.contains(e.target as Node)) setCpOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Initialise currency defaults from API
  useEffect(() => {
    if (currencies && currencies.length > 0 && !state.currencyId) {
      const base = currencies.find((c) => c.isBase) ?? currencies[0]
      form.setCurrency(base.id, base.code, 1)
    }
  }, [currencies]) // eslint-disable-line react-hooks/exhaustive-deps

  const groups = groupsData ?? []
  const products = productsData?.items ?? []
  const counterparties = cpData?.items ?? []
  const selectedCp = counterparties.find((c) => c.id === state.counterpartyId) ?? null
  const baseCurrency = currencies?.find((c) => c.isBase)
  const isBaseCurrency = !baseCurrency || state.currencyId === baseCurrency?.id

  /* ── handlers ── */

  const isOutbound = type === 'Expense' || type === 'ReturnToSupplier'

  const handleProductDblClick = useCallback((p: ProductDto) => {
    if (isOutbound) {
      const qty = stockByProductId.get(p.id) ?? 0
      if (qty <= 0) {
        showToast(`"${p.name}" отсутствует на складе`, 'error')
        return
      }
    }
    setSelectedProduct(p)
    setDialogOpen(true)
  }, [isOutbound, stockByProductId, showToast])

  const handleProductKeyDown = useCallback((e: React.KeyboardEvent, p: ProductDto) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (isOutbound) {
      const qty = stockByProductId.get(p.id) ?? 0
      if (qty <= 0) {
        showToast(`"${p.name}" отсутствует на складе`, 'error')
        return
      }
    }
    setSelectedProduct(p)
    setDialogOpen(true)
  }, [isOutbound, stockByProductId, showToast])

  const handleDialogConfirm = useCallback(
    (qty: number, price: number, discount: number) => {
      if (!selectedProduct) return
      form.addLine(
        { id: selectedProduct.id, name: selectedProduct.name, unit: selectedProduct.unit },
        qty, price, discount,
      )
      setDialogOpen(false)
      setSelectedProduct(null)
    },
    [selectedProduct, form],
  )

  const buildPayload = useCallback(() => ({
    type,
    date: state.date,
    ...(isAdmin ? { branchId: activeBranch?.id ?? null } : {}),
    counterpartyId: state.counterpartyId || null,
    currencyId: state.currencyId,
    exchangeRate: state.exchangeRate,
    discountPercent: state.discountPercent,
    note: state.note || null,
    lines: state.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      price: l.price,
      discountPercent: l.discountPercent,
    })),
  }), [type, state, isAdmin, activeBranch])

  const handleSaveDraft = useCallback(async () => {
    if (state.lines.length === 0) {
      showToast(t('common.error'), 'error')
      return
    }
    if (!state.counterpartyId) {
      showToast(t('documents.counterpartyRequired'), 'error')
      return
    }
    try {
      const payload = buildPayload()
      if (savedDocId) {
        await updateDoc.mutateAsync({ id: savedDocId, data: payload })
        showToast(t('documents.draftSaved'), 'success')
      } else {
        const result = await createDoc.mutateAsync(payload) as { id: number }
        setSavedDocId(result.id)
        showToast(t('documents.draftSaved'), 'success')
      }
    } catch {
      showToast(t('common.error'), 'error')
    }
  }, [state, savedDocId, buildPayload, createDoc, updateDoc, showToast, t])

  const handleConfirm = useCallback(async () => {
    if (state.lines.length === 0) {
      showToast(t('common.error'), 'error')
      return
    }
    if (!state.counterpartyId) {
      showToast(t('documents.counterpartyRequired'), 'error')
      return
    }
    try {
      let docId = savedDocId
      if (!docId) {
        const created = await createDoc.mutateAsync(buildPayload()) as { id: number }
        docId = created.id
        setSavedDocId(docId)
      } else {
        await updateDoc.mutateAsync({ id: docId, data: buildPayload() })
      }
      await confirmDoc.mutateAsync(docId)
      showToast(t('documents.confirmed'), 'success')
      form.clearForm()
      setSavedDocId(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? t('common.error')
      showToast(msg, 'error')
    }
  }, [state, savedDocId, buildPayload, createDoc, updateDoc, confirmDoc, showToast, form, t])

  const isSaving = createDoc.isPending || updateDoc.isPending
  const isConfirming = confirmDoc.isPending
  const isBlocked = adminNoBranch

  if (currenciesLoading || docLoading) return <DocumentFormSkeleton />

  /* ── render ── */
  return (
    <div className={cn('flex flex-col h-full bg-background text-[hsl(var(--text-primary))] relative', className)}>

      {/* ── Toast ── */}
      {toast && (
        <div className={cn(
          'absolute top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs shadow-xl',
          'transition-all animate-in fade-in slide-in-from-top-2',
          toast.type === 'success'
            ? 'border-emerald-600 bg-emerald-700 text-white'
            : 'border-red-600 bg-red-700 text-white',
        )}>
          {toast.type === 'error'
            ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            : <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* ── Page title + actions ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[hsl(var(--text-primary))]">{title}</h1>
          {existingDoc && (
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium border',
              existingDoc.status === 'Draft' && 'border-amber-500/30 bg-amber-500/10 text-amber-400',
              existingDoc.status === 'Confirmed' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
              existingDoc.status === 'Cancelled' && 'border-red-500/30 bg-red-500/10 text-red-400',
            )}>
              {existingDoc.number} · {t(`status.${existingDoc.status}`, { defaultValue: existingDoc.status })}
            </span>
          )}
          {!existingDoc && savedDocId && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
              Draft #{savedDocId}
            </span>
          )}
        </div>
        {!isReadonly && (
          <div className="flex items-center gap-2">
            {isBlocked && (
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 h-8 text-xs text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Выберите филиал в хидере
              </span>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isConfirming || isBlocked}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 h-8 text-xs text-[hsl(var(--text-muted))]',
                'hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('documents.saveDraft')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving || isConfirming || isBlocked}
              className={cn(
                'flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 h-8 text-xs text-white font-medium',
                'hover:bg-indigo-500 active:bg-indigo-700 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isConfirming
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle className="h-3.5 w-3.5" />}
              {t('documents.saveAndConfirm')}
            </button>
          </div>
        )}
      </div>

      {/* ── Header row ── */}
      <div className="flex flex-wrap items-end gap-2 px-4 pb-3 border-b border-[hsl(var(--border))]">
        {/* Date */}
        <label className="flex flex-col gap-1 min-w-[130px]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('common.date')}</span>
          <input
            type="date"
            value={state.date}
            onChange={(e) => !isReadonly && form.setDate(e.target.value)}
            readOnly={isReadonly}
            className={cn(
              'h-8 rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))]',
              'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
              isReadonly && 'opacity-70 cursor-default',
            )}
          />
        </label>

        {/* Counterparty combobox */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]" ref={cpRef}>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">
            {cpType === 'Customer' ? t('counterparties.Customer') : t('counterparties.Supplier')}
          </span>
          <div className="relative">
            <input
              type="text"
              placeholder={t('documents.selectCounterparty')}
              value={cpOpen ? cpSearch : (state.counterpartyName || '')}
              onFocus={() => { if (!isReadonly) { setCpSearch(''); setCpOpen(true) } }}
              onChange={(e) => { if (!isReadonly) { setCpSearch(e.target.value); setCpOpen(true) } }}
              readOnly={isReadonly}
              className={cn(
                'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))]',
                'placeholder:text-[hsl(var(--text-muted))]',
                'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
                isReadonly && 'opacity-70 cursor-default',
              )}
            />
            {cpOpen && counterparties.length > 0 && (
              <div className={cn(
                'absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border',
                'bg-card/95 backdrop-blur-xl shadow-xl max-h-48 overflow-y-auto',
              )}>
                {counterparties.map((cp) => (
                  <button
                    key={cp.id}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      form.setCounterparty(cp.id, cp.name)
                      setCpSearch('')
                      setCpOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-[hsl(var(--surface-2))] transition-colors',
                      state.counterpartyId === cp.id ? 'text-indigo-400' : 'text-[hsl(var(--text-primary))]',
                    )}
                  >
                    <span className="truncate">{cp.name}</span>
                    <span className={cn(
                      'font-mono ml-2 shrink-0',
                      cp.balance > 0 ? 'text-red-400' : cp.balance < 0 ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]',
                    )}>
                      {fmt(cp.balance)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Balance */}
        {selectedCp && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('counterparties.balance')}</span>
            <div className={cn(
              'h-8 rounded-lg border border-border bg-secondary px-2.5 flex items-center text-xs font-mono',
              selectedCp.balance > 0 ? 'text-red-400' : selectedCp.balance < 0 ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]',
            )}>
              {fmt(selectedCp.balance)}
            </div>
          </div>
        )}

        {/* Currency */}
        <label className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('common.currency')}</span>
          <select
            value={state.currencyId}
            onChange={(e) => {
              if (isReadonly) return
              const cur = (currencies ?? []).find((c) => c.id === e.target.value)
              if (cur) form.setCurrency(cur.id, cur.code, cur.isBase ? 1 : state.exchangeRate)
            }}
            disabled={isReadonly}
            className={cn(
              'h-8 rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))]',
              'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
              isReadonly && 'opacity-70 cursor-default',
            )}
          >
            {(currencies ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        </label>

        {/* Exchange rate */}
        {!isBaseCurrency && (
          <label className="flex flex-col gap-1 min-w-[100px]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('documents.rate')}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={state.exchangeRate}
              onChange={(e) => !isReadonly && form.setCurrency(state.currencyId, state.currencyCode, parseFloat(e.target.value) || 1)}
              readOnly={isReadonly}
              className={cn(
                'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))] font-mono',
                'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
                isReadonly && 'opacity-70 cursor-default',
              )}
            />
          </label>
        )}

        {/* Note */}
        <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('documents.comment')}</span>
          <input
            type="text"
            placeholder="..."
            value={state.note}
            onChange={(e) => !isReadonly && form.setNote(e.target.value)}
            readOnly={isReadonly}
            className={cn(
              'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))]',
              'placeholder:text-[hsl(var(--text-muted))]',
              'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
              isReadonly && 'opacity-70 cursor-default',
            )}
          />
        </label>
      </div>

      {/* ── Split Panel ── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* ── Left panel (30%) — hidden in readonly mode ── */}
        <div className={cn('flex w-[30%] min-w-[200px] flex-col border-r border-[hsl(var(--border))]', isReadonly && 'hidden')}>
          {/* Search */}
          <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--text-muted))]" />
              <input
                type="text"
                placeholder={t('documents.productSearch')}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={cn(
                  'h-7 w-full rounded-md border border-border bg-secondary pl-8 pr-3 text-xs text-[hsl(var(--text-primary))]',
                  'placeholder:text-[hsl(var(--text-muted))]',
                  'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
                )}
              />
            </div>
          </div>

          {/* Group tree */}
          <div className="flex-1 min-h-0 overflow-y-auto border-b border-[hsl(var(--border))] py-1 px-1">
            <p className="px-2 py-1 text-[9px] uppercase tracking-widest text-[hsl(var(--text-muted))] font-semibold">{t('products.group')}</p>
            {groupsLoading ? (
              <div className="space-y-1 px-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-6" />)}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setActiveGroupId(null)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    activeGroupId === null
                      ? 'bg-indigo-500/15 text-indigo-400'
                      : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                  )}
                >
                  {t('products.allGroups')}
                </button>
                <GroupTree
                  groups={groups}
                  activeGroupId={activeGroupId}
                  onSelect={setActiveGroupId}
                />
              </>
            )}
          </div>

          {/* Products table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="px-2 py-1.5 text-left text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('documents.product')}</th>
                  <th className="px-2 py-1.5 text-right text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('products.stock')}</th>
                  <th className="px-2 py-1.5 text-right text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('common.price')}</th>
                </tr>
              </thead>
              <tbody>
                {productsLoading ? (
                  <tr><td colSpan={3} className="px-2 py-4 text-center text-xs text-[hsl(var(--text-muted))]">Загрузка...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={3} className="px-2 py-6 text-center text-xs text-[hsl(var(--text-muted))]">{t('products.noProducts')}</td></tr>
                ) : (
                  products.map((p) => (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onDoubleClick={() => handleProductDblClick(p)}
                      onKeyDown={(e) => handleProductKeyDown(e, p)}
                      className={cn(
                        'border-b border-[hsl(var(--border))] cursor-pointer outline-none transition-colors',
                        'hover:bg-[hsl(var(--surface-2))] focus:bg-indigo-500/10 focus:text-indigo-300',
                      )}
                      title="Двойной клик или Enter"
                    >
                      <td className="px-2 py-1.5 text-[hsl(var(--text-primary))]">
                        <span>{p.name}</span>
                        <span className="text-[9px] text-[hsl(var(--text-muted))]">{t(`products.units.${p.unit}`, p.unit)}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[hsl(var(--text-muted))]">
                        {stockByProductId != null
                          ? (stockByProductId.get(p.id) ?? 0)
                          : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[hsl(var(--text-muted))]">
                        {fmt(defaultPriceFor(type, p))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right panel (70%) ── */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="w-8 px-2 py-2 text-center text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">#</th>
                  <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('documents.product')}</th>
                  <th className="w-20 px-2 py-2 text-right text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('documents.qty')}</th>
                  <th className="w-10 px-2 py-2 text-center text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('documents.unit')}</th>
                  <th className="w-28 px-2 py-2 text-right text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('documents.priceCol')}</th>
                  <th className="w-16 px-2 py-2 text-right text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">%</th>
                  <th className="w-28 px-2 py-2 text-right text-[9px] uppercase tracking-wider text-[hsl(var(--text-muted))] font-semibold">{t('documents.sumCol')}</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {state.lines.map((line, idx) => (
                  <tr
                    key={line.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-2))] transition-colors group"
                  >
                    <td className="px-2 py-1.5 text-center font-mono text-[hsl(var(--text-muted))] tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-1.5 text-[hsl(var(--text-primary))]">{line.productName}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0.001" step="1"
                        value={line.quantity}
                        onChange={(e) => !isReadonly && form.updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        readOnly={isReadonly}
                        className={cn(
                          'w-full h-7 rounded border border-transparent bg-transparent px-1 text-right text-xs font-mono tabular-nums text-[hsl(var(--text-primary))]',
                          !isReadonly && 'focus:border-indigo-500/40 focus:bg-secondary focus:outline-none transition-colors hover:border-border',
                          isReadonly && 'cursor-default',
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center text-[hsl(var(--text-muted))]">{t(`products.units.${line.unit}`, line.unit)}</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" step="100"
                        value={line.price}
                        onChange={(e) => !isReadonly && form.updateLine(line.id, 'price', parseFloat(e.target.value) || 0)}
                        readOnly={isReadonly}
                        className={cn(
                          'w-full h-7 rounded border border-transparent bg-transparent px-1 text-right text-xs font-mono tabular-nums text-[hsl(var(--text-primary))]',
                          !isReadonly && 'focus:border-indigo-500/40 focus:bg-secondary focus:outline-none transition-colors hover:border-border',
                          isReadonly && 'cursor-default',
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number" min="0" max="100" step="1"
                        value={line.discountPercent}
                        onChange={(e) => !isReadonly && form.updateLine(line.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                        readOnly={isReadonly}
                        className={cn(
                          'w-full h-7 rounded border border-transparent bg-transparent px-1 text-right text-xs font-mono tabular-nums text-[hsl(var(--text-primary))]',
                          !isReadonly && 'focus:border-indigo-500/40 focus:bg-secondary focus:outline-none transition-colors hover:border-border',
                          isReadonly && 'cursor-default',
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{fmt(line.total)}</td>
                    <td className="px-2 py-1.5 text-center">
                      {!isReadonly && (
                        <button
                          onClick={() => form.removeLine(line.id)}
                          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {state.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-xs text-[hsl(var(--text-muted))]">
                      {t('common.noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Totals ── */}
          <div className="shrink-0 border-t border-[hsl(var(--border))] bg-card/60 px-5 py-3">
            <div className="ml-auto max-w-xs flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[hsl(var(--text-muted))]">{t('documents.totalSum')}:</span>
                <span className="font-mono tabular-nums text-[hsl(var(--text-primary))]">
                  {fmt(form.subtotal)} {state.currencyCode}
                </span>
              </div>
              {!isBaseCurrency && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[hsl(var(--text-muted))]">{t('common.currency')}:</span>
                  <span className="font-mono tabular-nums text-[hsl(var(--text-muted))]">
                    {fmt(form.totalInBase)} {baseCurrency?.code}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[hsl(var(--text-muted))] flex items-center gap-2">
                  {t('common.amount')} (%):
                  <input
                    type="number" min="0" max="100" step="0.5"
                    value={state.discountPercent}
                    onChange={(e) => !isReadonly && form.setDiscount(parseFloat(e.target.value) || 0)}
                    readOnly={isReadonly}
                    className={cn(
                      'w-14 h-6 rounded border border-border bg-secondary px-1.5 text-right text-xs font-mono tabular-nums text-[hsl(var(--text-primary))]',
                      !isReadonly && 'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors',
                      isReadonly && 'opacity-70 cursor-default',
                    )}
                  />
                </span>
                <span className="font-mono tabular-nums text-red-400">
                  -{fmt(form.discountAmount)} {state.currencyCode}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-[hsl(var(--border))]">
                <span className="font-medium text-[hsl(var(--text-primary))]">{t('common.total')}:</span>
                <span className="font-mono tabular-nums font-semibold text-indigo-400 text-sm">
                  {fmt(form.totalWithDiscount)} {state.currencyCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quantity Dialog ── */}
      {selectedProduct && (
        <QuantityDialog
          open={dialogOpen}
          productName={selectedProduct.name}
          stock={stockByProductId?.get(selectedProduct.id) ?? 0}
          unit={selectedProduct.unit}
          defaultPrice={defaultPriceFor(type, selectedProduct)}
          onConfirm={handleDialogConfirm}
          onClose={() => { setDialogOpen(false); setSelectedProduct(null) }}
        />
      )}
    </div>
  )
}
