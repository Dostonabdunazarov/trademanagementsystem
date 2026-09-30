import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2, ChevronDown, ChevronRight, Search, Save, CheckCircle, Loader2, AlertCircle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { money } from '@/utils/money'
import type { DocumentType } from '@/types/document'
import { useDocumentForm } from './useDocumentForm'
import { QuantityDialog } from './QuantityDialog'
import { CounterpartyCombobox } from './CounterpartyCombobox'
import { useProductGroups } from '@/api/hooks/useProductGroups'
import type { ProductGroupDto } from '@/api/hooks/useProductGroups'
import { useProducts } from '@/api/hooks/useProducts'
import type { ProductDto } from '@/api/hooks/useProducts'
import type { CounterpartyDto } from '@/api/hooks/useCounterparties'
import { useCurrencies } from '@/api/hooks/useCurrencies'
import { useExchangeRateOn } from '@/api/hooks/useExchangeRates'
import {
  useCreateDocument,
  useUpdateDocument,
  useConfirmDocument,
  useCancelDocument,
  type CreateDocumentPayload,
  type UpdateDocumentPayload,
} from '@/api/hooks/useDocumentMutations'
import { useDocument } from '@/api/hooks/useDocument'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { useStockBalance } from '@/api/hooks/useReports'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function counterpartyTypeFor(type: DocumentType): 'Customer' | 'Supplier' {
  return type === 'Income' || type === 'ReturnToSupplier' || type === 'PayOut'
    ? 'Supplier'
    : 'Customer'
}

function defaultPriceFor(type: DocumentType, product: ProductDto): number {
  return type === 'Income' || type === 'ReturnToSupplier'
    ? product.priceBuy
    : product.priceSell
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
                ? 'bg-brand-500/15 text-brand-400'
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

/**
 * Форма товарного документа. `?id=` открывает существующий документ: черновик
 * редактируется и проводится **этот же** документ, проведённый — только просмотр.
 * `key` по id пересоздаёт форму при переходе между документами и после проведения.
 */
export function DocumentForm(props: DocumentFormProps) {
  const [searchParams] = useSearchParams()
  const urlId = searchParams.get('id')
  const parsed = urlId ? Number.parseInt(urlId, 10) : NaN
  const editId = Number.isFinite(parsed) ? parsed : null
  return <DocumentFormBody key={editId ?? 'new'} {...props} editId={editId} />
}

function DocumentFormBody({ type, title, className, editId }: DocumentFormProps & { editId: number | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useDocumentForm(type)
  const { state } = form

  const { data: existingDoc, isLoading: docLoading } = useDocument(editId)
  const formLoaded = useRef(false)

  const { data: currencies, isLoading: currenciesLoading } = useCurrencies()
  const baseCurrency = currencies?.find((c) => c.isBase)

  useEffect(() => {
    if (!existingDoc || formLoaded.current) return
    formLoaded.current = true
    form.load({
      date: existingDoc.date.slice(0, 10),
      counterpartyId: existingDoc.counterpartyId ?? '',
      counterpartyName: existingDoc.counterpartyName ?? '',
      currencyId: existingDoc.currencyId,
      currencyCode: existingDoc.currencyCode,
      exchangeRate: existingDoc.exchangeRate,
      discountPercent: existingDoc.discountPercent,
      note: existingDoc.note ?? '',
      lines: existingDoc.lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        unit: l.unit,
        quantity: l.quantity,
        price: l.price,
        discountPercent: l.discountPercent,
      })),
    })
  }, [existingDoc, form])

  const isReadonly = !!existingDoc && existingDoc.status !== 'Draft'

  // API data
  const { data: groupsData, isLoading: groupsLoading } = useProductGroups()
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const debouncedProductSearch = useDebouncedValue(productSearch, 250)
  const { data: productsData, isLoading: productsLoading } = useProducts({
    groupId: activeGroupId,
    search: debouncedProductSearch || undefined,
    pageSize: 200,
  })

  const cpType = counterpartyTypeFor(type)
  const [selectedCp, setSelectedCp] = useState<CounterpartyDto | null>(null)

  // Branch & role
  const user = useAuthStore((s) => s.user)
  const activeBranch = useUiStore((s) => s.activeBranch)
  const isAdmin = user?.role === 'Admin'
  const canCancel = user?.role === 'Admin' || user?.role === 'Manager'
  const adminNoBranch = isAdmin && !activeBranch

  // Stock check for outbound document types; also show stock for Income
  const { data: stockData } = useStockBalance(activeBranch?.id)
  const stockByProductId = (stockData?.lines ?? []).reduce<Map<string, number>>((map, l) => {
      map.set(l.productId, (map.get(l.productId) ?? 0) + l.quantity)
      return map
    }, new Map())

  // Курс: по умолчанию — курс из «Валюты и курсы» на дату документа (так же его
  // возьмёт сервер при проведении); ручной ввод имеет приоритет до смены валюты/даты.
  const isBaseCurrency = !baseCurrency || state.currencyId === baseCurrency.id
  const [rateManual, setRateManual] = useState(false)
  const { rate: autoRate, isLoading: rateLoading } = useExchangeRateOn(
    isBaseCurrency ? undefined : state.currencyId,
    baseCurrency?.id,
    state.date,
  )
  const effectiveRate = isBaseCurrency ? 1 : rateManual ? state.exchangeRate : autoRate ?? state.exchangeRate
  const totalInBase = money(form.totalWithDiscount * effectiveRate)

  // Mutations
  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const confirmDoc = useConfirmDocument()
  const cancelDoc = useCancelDocument()

  // Saved document id (after first save as Draft, or pre-filled from URL)
  const [savedDocId, setSavedDocId] = useState<number | null>(editId)
  const [cancelOpen, setCancelOpen] = useState(false)

  const showError = (message: string) => {
    toast.error(message, { duration: 7000 })
  }

  // Product dialog
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Initialise currency defaults from API
  useEffect(() => {
    if (editId != null) return
    if (currencies && currencies.length > 0 && !state.currencyId) {
      const base = currencies.find((c) => c.isBase) ?? currencies[0]
      form.setCurrency(base.id, base.code, 1)
    }
  }, [currencies, state.currencyId, editId, form])

  const groups = groupsData ?? []
  const products = productsData?.items ?? []

  /* ── handlers ── */

  const isOutbound = type === 'Expense' || type === 'ReturnToSupplier'

  const openProduct = (p: ProductDto) => {
    if (isOutbound) {
      const qty = stockByProductId.get(p.id) ?? 0
      if (qty <= 0) {
        showError(t('errors.outOfStock', { product: p.name }))
        return
      }
    }
    setSelectedProduct(p)
    setDialogOpen(true)
  }

  const handleProductKeyDown = (e: React.KeyboardEvent, p: ProductDto) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    openProduct(p)
  }

  const handleDialogConfirm = (qty: number, price: number, discount: number) => {
      if (!selectedProduct) return
      form.addLine(
        { id: selectedProduct.id, name: selectedProduct.name, unit: selectedProduct.unit },
        qty, price, discount,
      )
      setDialogOpen(false)
      setSelectedProduct(null)
    }

  const buildUpdatePayload = (): UpdateDocumentPayload => ({
    date: state.date,
    counterpartyId: state.counterpartyId || null,
    currencyId: state.currencyId,
    exchangeRate: effectiveRate,
    discountPercent: state.discountPercent,
    note: state.note || null,
    lines: state.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      price: l.price,
      discountPercent: l.discountPercent,
    })),
  })

  const buildCreatePayload = (): CreateDocumentPayload => ({
    ...buildUpdatePayload(),
    type,
    ...(isAdmin ? { branchId: activeBranch?.id ?? null } : {}),
  })

  /** Проверка перед отправкой: возвращает текст первой ошибки или null. */
  const validate = (forConfirm: boolean): string | null => {
    if (state.lines.length === 0) return t('errors.codes.linesRequired')
    if (!state.counterpartyId) return t('documents.counterpartyRequired')
    if (!state.currencyId) return t('errors.codes.currencyRequired')
    for (const [idx, l] of state.lines.entries()) {
      if (!(l.quantity > 0)) return t('errors.line', { n: idx + 1, message: t('errors.codes.lineQuantityPositive') })
      if (l.unit === 'Pcs' && !Number.isInteger(l.quantity)) {
        return t('errors.line', { n: idx + 1, message: t('errors.codes.lineQuantityInteger') })
      }
      if (l.price < 0) return t('errors.line', { n: idx + 1, message: t('errors.codes.linePriceNonNegative') })
    }

    // Для расхода проверяем остатки заранее, чтобы назвать товар и цифры,
    // не дожидаясь отказа сервера. Сервер всё равно проверяет сам.
    if (forConfirm && isOutbound && stockData) {
      const needed = new Map<string, { name: string; unit: string; qty: number }>()
      for (const l of state.lines) {
        const cur = needed.get(l.productId)
        needed.set(l.productId, { name: l.productName, unit: l.unit, qty: (cur?.qty ?? 0) + l.quantity })
      }
      for (const [productId, { name, unit, qty }] of needed) {
        const available = stockByProductId.get(productId) ?? 0
        if (qty > available) {
          return t('errors.codes.insufficientStock', {
            product: name,
            unit: t(`products.units.${unit}`, { defaultValue: unit }),
            available: available.toLocaleString('ru-RU'),
            needed: qty.toLocaleString('ru-RU'),
          })
        }
      }
    }
    return null
  }

  const handleSaveDraft = async () => {
    const invalid = validate(false)
    if (invalid) {
      showError(invalid)
      return
    }
    try {
      if (savedDocId) {
        await updateDoc.mutateAsync({ id: savedDocId, data: buildUpdatePayload() })
      } else {
        const result = await createDoc.mutateAsync(buildCreatePayload())
        setSavedDocId(result.id)
      }
      toast.success(t('documents.draftSaved'))
    } catch (err) {
      showError(getApiErrorMessage(err, t))
    }
  }

  const handleConfirm = async () => {
    const invalid = validate(true)
    if (invalid) {
      showError(invalid)
      return
    }
    try {
      let docId = savedDocId
      if (!docId) {
        const created = await createDoc.mutateAsync(buildCreatePayload())
        docId = created.id
        setSavedDocId(docId)
      } else {
        await updateDoc.mutateAsync({ id: docId, data: buildUpdatePayload() })
      }
      await confirmDoc.mutateAsync(docId)
      toast.success(t('documents.confirmed'))
      if (editId != null) {
        // Открыт по ?id= — уходим на чистую форму, а не остаёмся на пустой форме со старым id.
        navigate(location.pathname, { replace: true })
      } else {
        form.clearForm()
        setSelectedCp(null)
        setRateManual(false)
        setSavedDocId(null)
      }
    } catch (err) {
      showError(getApiErrorMessage(err, t))
    }
  }

  const handleCancelDocument = async () => {
    if (!existingDoc) return
    try {
      await cancelDoc.mutateAsync(existingDoc.id)
      toast.success(t('documents.cancelled'))
    } catch (err) {
      showError(getApiErrorMessage(err, t))
    } finally {
      setCancelOpen(false)
    }
  }

  const isSaving = createDoc.isPending || updateDoc.isPending
  const isConfirming = confirmDoc.isPending
  const isBlocked = adminNoBranch

  if (currenciesLoading || docLoading) return <DocumentFormSkeleton />

  /* ── render ── */
  return (
    <div className={cn('flex flex-col h-full bg-background text-[hsl(var(--text-primary))] relative', className)}>

      {/* ── Page title + actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[hsl(var(--text-primary))]">{title}</h1>
          {existingDoc && (
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium border',
              existingDoc.status === 'Draft' && 'border-orange-500/30 bg-orange-500/10 text-orange-400',
              existingDoc.status === 'Confirmed' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
              existingDoc.status === 'Cancelled' && 'border-red-500/30 bg-red-500/10 text-red-400',
            )}>
              {existingDoc.number} · {t(`status.${existingDoc.status}`, { defaultValue: existingDoc.status })}
            </span>
          )}
          {!existingDoc && savedDocId && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-orange-500/30 bg-orange-500/10 text-orange-400">
              {t('status.Draft')} #{savedDocId}
            </span>
          )}
        </div>
        {existingDoc?.status === 'Confirmed' && canCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            disabled={cancelDoc.isPending}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 h-8 text-xs text-red-400',
              'hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {cancelDoc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            {t('documents.cancelDocument')}
          </button>
        )}
        {!isReadonly && (
          <div className="flex flex-wrap items-center gap-2">
            {isBlocked && (
              <span className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 h-8 text-xs text-orange-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('settings.selectBranchFirst')}
              </span>
            )}
            <button
              type="button"
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
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || isConfirming || isBlocked}
              className={cn(
                'flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 h-8 text-xs text-brand-fg font-medium',
                'hover:bg-brand-500 active:bg-brand-700 transition-colors',
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
        <div className="flex flex-col gap-1 min-w-[130px]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('common.date')}</span>
          <DatePicker
            value={state.date}
            onChange={(v) => { if (!isReadonly) { form.setDate(v); setRateManual(false) } }}
            disabled={isReadonly}
          />
        </div>

        {/* Counterparty combobox */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">
            {cpType === 'Customer' ? t('counterparties.Customer') : t('counterparties.Supplier')}
          </span>
          <CounterpartyCombobox
            type={cpType}
            selectedId={state.counterpartyId}
            selectedName={state.counterpartyName}
            onSelect={(cp) => { form.setCounterparty(cp.id, cp.name); setSelectedCp(cp) }}
            readOnly={isReadonly}
            label={cpType === 'Customer' ? t('counterparties.Customer') : t('counterparties.Supplier')}
            className={cn(
              'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))]',
              'placeholder:text-[hsl(var(--text-muted))]',
              'focus:outline-none focus:ring-1 focus:ring-brand-500/60 transition-colors',
            )}
          />
        </div>

        {/* Balance */}
        {selectedCp && selectedCp.id === state.counterpartyId && (
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
          <Select
            value={state.currencyId}
            onValueChange={(id) => {
              if (isReadonly) return
              const cur = (currencies ?? []).find((c) => c.id === id)
              if (cur) {
                form.setCurrency(cur.id, cur.code, cur.isBase ? 1 : state.exchangeRate)
                setRateManual(false)
              }
            }}
            disabled={isReadonly}
          >
            <SelectTrigger className="h-8 px-2.5 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(currencies ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {/* Exchange rate */}
        {!isBaseCurrency && (
          <label className="flex flex-col gap-1 min-w-[100px]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('documents.rate')}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={effectiveRate}
              onChange={(e) => {
                if (isReadonly) return
                form.setExchangeRate(parseFloat(e.target.value) || 1)
                setRateManual(true)
              }}
              readOnly={isReadonly}
              className={cn(
                'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))] font-mono',
                'focus:outline-none focus:ring-1 focus:ring-brand-500/60 transition-colors',
                isReadonly && 'opacity-70 cursor-default',
              )}
            />
            {!isReadonly && !rateManual && !rateLoading && autoRate == null && (
              <span className="text-[10px] text-orange-400">{t('documents.rateNotFound')}</span>
            )}
          </label>
        )}

        {/* Note */}
        <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">{t('documents.comment')}</span>
          <input
            type="text"
            placeholder={t('payments.noteOptional')}
            value={state.note}
            onChange={(e) => !isReadonly && form.setNote(e.target.value)}
            readOnly={isReadonly}
            className={cn(
              'h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-xs text-[hsl(var(--text-primary))]',
              'placeholder:text-[hsl(var(--text-muted))]',
              'focus:outline-none focus:ring-1 focus:ring-brand-500/60 transition-colors',
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
                  'focus:outline-none focus:ring-1 focus:ring-brand-500/60 transition-colors',
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
                      ? 'bg-brand-500/15 text-brand-400'
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
                  <tr><td colSpan={3} className="px-2 py-4 text-center text-xs text-[hsl(var(--text-muted))]">{t('common.loading')}</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={3} className="px-2 py-6 text-center text-xs text-[hsl(var(--text-muted))]">{t('products.noProducts')}</td></tr>
                ) : (
                  products.map((p) => (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onDoubleClick={() => openProduct(p)}
                      onKeyDown={(e) => handleProductKeyDown(e, p)}
                      className={cn(
                        'border-b border-[hsl(var(--border))] cursor-pointer outline-none transition-colors',
                        'hover:bg-[hsl(var(--surface-2))] focus:bg-brand-500/10 focus:text-brand-300',
                      )}
                      title={t('documents.addProductHint')}
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
                          !isReadonly && 'focus:border-brand-500/40 focus:bg-secondary focus:outline-none transition-colors hover:border-border',
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
                          !isReadonly && 'focus:border-brand-500/40 focus:bg-secondary focus:outline-none transition-colors hover:border-border',
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
                          !isReadonly && 'focus:border-brand-500/40 focus:bg-secondary focus:outline-none transition-colors hover:border-border',
                          isReadonly && 'cursor-default',
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[hsl(var(--text-primary))]">{fmt(line.total)}</td>
                    <td className="px-2 py-1.5 text-center">
                      {!isReadonly && (
                        <button
                          type="button"
                          onClick={() => form.removeLine(line.id)}
                          aria-label={t('documents.removeLine', { product: line.productName })}
                          title={t('common.remove')}
                          className={cn(
                            'rounded p-0.5 text-[hsl(var(--text-muted))] hover:text-red-400 hover:bg-red-500/10 transition-all',
                            // На тач-экранах и с клавиатуры кнопка видна всегда, мышью — при наведении.
                            'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
                          )}
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
            <div className="ml-auto max-w-sm flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[hsl(var(--text-muted))]">{t('documents.totalSum')}:</span>
                <span className="font-mono tabular-nums text-[hsl(var(--text-primary))]">
                  {fmt(form.subtotal)} {state.currencyCode}
                </span>
              </div>
              {!isBaseCurrency && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[hsl(var(--text-muted))]">{t('payments.inBaseCurrency')}:</span>
                  <span className="font-mono tabular-nums text-[hsl(var(--text-muted))]">
                    {fmt(totalInBase)} {baseCurrency?.code}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[hsl(var(--text-muted))] flex items-center gap-2">
                  {t('documents.discount')} (%):
                  <input
                    type="number" min="0" max="100" step="0.5"
                    aria-label={t('documents.discount')}
                    value={state.discountPercent}
                    onChange={(e) => !isReadonly && form.setDiscount(parseFloat(e.target.value) || 0)}
                    readOnly={isReadonly}
                    className={cn(
                      'w-16 h-7 rounded border border-border bg-secondary px-1.5 text-right text-sm font-mono tabular-nums text-[hsl(var(--text-primary))]',
                      !isReadonly && 'focus:outline-none focus:ring-1 focus:ring-brand-500/60 transition-colors',
                      isReadonly && 'opacity-70 cursor-default',
                    )}
                  />
                </span>
                <span className="font-mono tabular-nums text-red-400">
                  -{fmt(form.discountAmount)} {state.currencyCode}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[hsl(var(--border))]">
                <span className="font-medium text-[hsl(var(--text-primary))] text-base">{t('common.total')}:</span>
                <span className="font-mono tabular-nums font-semibold text-brand-400 text-lg">
                  {fmt(form.totalWithDiscount)} {state.currencyCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quantity Dialog ── */}
      {selectedProduct && dialogOpen && (
        <QuantityDialog
          key={selectedProduct.id}
          productName={selectedProduct.name}
          stock={stockByProductId?.get(selectedProduct.id) ?? 0}
          unit={selectedProduct.unit}
          defaultPrice={defaultPriceFor(type, selectedProduct)}
          onConfirm={handleDialogConfirm}
          onClose={() => { setDialogOpen(false); setSelectedProduct(null) }}
        />
      )}

      <ConfirmDialog
        open={cancelOpen}
        title={t('documents.cancelDocumentTitle', { number: existingDoc?.number ?? '' })}
        description={t('documents.cancelDocumentDesc')}
        confirmLabel={t('documents.cancelDocument')}
        busy={cancelDoc.isPending}
        onConfirm={handleCancelDocument}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  )
}
