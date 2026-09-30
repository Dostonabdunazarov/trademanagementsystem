import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Save, CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/apiError'
import { money } from '@/utils/money'
import { todayIso } from '@/utils/format'
import type { DocumentType, PaymentMethod } from '@/types/document'
import type { CounterpartyDto } from '@/api/hooks/useCounterparties'
import { useCurrencies } from '@/api/hooks/useCurrencies'
import { useAccounts } from '@/api/hooks/useAccounts'
import { useExchangeRateOn } from '@/api/hooks/useExchangeRates'
import {
  useCreateDocument,
  useUpdateDocument,
  useConfirmDocument,
  useCancelDocument,
  type UpdateDocumentPayload,
} from '@/api/hooks/useDocumentMutations'
import { useDocument } from '@/api/hooks/useDocument'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CounterpartyCombobox } from './CounterpartyCombobox'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

// «Приём оплаты» (PayIn) — деньги от клиента, «Выплата» (PayOut) — деньги поставщику.
function counterpartyTypeFor(type: DocumentType): 'Customer' | 'Supplier' {
  return type === 'PayOut' ? 'Supplier' : 'Customer'
}

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'BankTransfer', 'Card']

/* ─── Skeleton ────────────────────────────────────────────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[hsl(var(--surface-2))]', className)} />
}

function PaymentFormSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-full max-w-lg flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  )
}

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface PaymentFormProps {
  type: DocumentType
  title: string
  className?: string
}

/* ─── Component ───────────────────────────────────────────────────────────── */

/**
 * Приём оплаты / выплата. `?id=` черновика редактирует и проводит **этот же**
 * документ (PUT + confirm), а не создаёт новый (AUDIT FE-4).
 */
export function PaymentForm(props: PaymentFormProps) {
  const [searchParams] = useSearchParams()
  const urlId = searchParams.get('id')
  const parsed = urlId ? Number.parseInt(urlId, 10) : NaN
  const editId = Number.isFinite(parsed) ? parsed : null
  return <PaymentFormBody key={editId ?? 'new'} {...props} editId={editId} />
}

function PaymentFormBody({ type, title, className, editId }: PaymentFormProps & { editId: number | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: existingDoc, isLoading: docLoading } = useDocument(editId)
  const formLoaded = useRef(false)
  const isReadonly = !!existingDoc && existingDoc.status !== 'Draft'

  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const confirmDoc = useConfirmDocument()
  const cancelDoc = useCancelDocument()

  const user = useAuthStore((s) => s.user)
  const activeBranch = useUiStore((s) => s.activeBranch)
  const isAdmin = user?.role === 'Admin'
  const canCancel = user?.role === 'Admin' || user?.role === 'Manager'
  const adminNoBranch = isAdmin && !activeBranch

  // Филиал документа: для Admin — выбранный в шапке, для остальных — из токена.
  const docBranchId = existingDoc?.branchId ?? (isAdmin ? activeBranch?.id : user?.branchId ?? undefined)

  const cpType = counterpartyTypeFor(type)

  const { data: currencies = [], isLoading: currenciesLoading } = useCurrencies()
  const baseCurrency = currencies.find((c) => c.isBase)
  const { data: accounts = [] } = useAccounts(isAdmin ? docBranchId : undefined, { enabled: !isAdmin || !!docBranchId })

  const [date, setDate] = useState(todayIso)
  const [counterpartyId, setCounterpartyId] = useState('')
  const [counterpartyName, setCounterpartyName] = useState('')
  const [selectedCp, setSelectedCp] = useState<CounterpartyDto | null>(null)
  const [amount, setAmount] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [manualRate, setManualRate] = useState<number | null>(null)
  const [storedRate, setStoredRate] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [savedDocId] = useState<number | null>(editId)
  const [cancelOpen, setCancelOpen] = useState(false)

  const showError = useCallback((message: string) => toast.error(message, { duration: 7000 }), [])

  // Prefill fields from an existing document opened via ?id=
  /* eslint-disable react-hooks/set-state-in-effect -- однократная загрузка документа с сервера в локальную форму */
  useEffect(() => {
    if (!existingDoc || formLoaded.current) return
    formLoaded.current = true
    setDate(existingDoc.date.slice(0, 10))
    setCounterpartyId(existingDoc.counterpartyId ?? '')
    setCounterpartyName(existingDoc.counterpartyName ?? '')
    setAmount(String(existingDoc.amount ?? existingDoc.totalAmount))
    setCurrencyId(existingDoc.currencyId)
    setStoredRate(existingDoc.exchangeRate)
    if (existingDoc.paymentMethod) setPaymentMethod(existingDoc.paymentMethod as PaymentMethod)
    setAccountId(existingDoc.accountId ?? '')
    setNote(existingDoc.note ?? '')
  }, [existingDoc])
  /* eslint-enable react-hooks/set-state-in-effect */

  const effectiveCurrencyId = currencyId || baseCurrency?.id || ''
  const selectedCurrency = currencies.find((c) => c.id === effectiveCurrencyId)
  const isBaseCurrency = !baseCurrency || effectiveCurrencyId === baseCurrency.id

  // Курс на дату документа из справочника (так его возьмёт сервер); ручной ввод — приоритетнее.
  const { rate: autoRate, isLoading: rateLoading } = useExchangeRateOn(
    isBaseCurrency ? undefined : effectiveCurrencyId,
    baseCurrency?.id,
    date,
  )
  const exchangeRate = isBaseCurrency ? 1 : manualRate ?? autoRate ?? storedRate

  // Касса — только своего филиала и в базовой валюте: иначе сервер вернёт
  // accountBranchMismatch / accountCurrencyMismatch. Без выбора пользователя
  // подставляем кассу, только если подходящая ровно одна.
  const availableAccounts = accounts.filter(
    (a) => (!docBranchId || a.branchId === docBranchId) && (!baseCurrency || a.currencyId === baseCurrency.id),
  )
  const effectiveAccountId = availableAccounts.some((a) => a.id === accountId)
    ? accountId
    : availableAccounts.length === 1 ? availableAccounts[0].id : ''

  const amountNumber = parseFloat(amount)
  const amountInBase = Number.isFinite(amountNumber) ? money(amountNumber * exchangeRate) : 0

  const listRoute = type === 'PayOut' ? '/pay-outs' : '/pay-ins'

  const buildUpdatePayload = (): UpdateDocumentPayload => ({
    date,
    counterpartyId: counterpartyId || null,
    currencyId: effectiveCurrencyId,
    exchangeRate,
    discountPercent: 0,
    note: note || null,
    // Платёжный документ: строк нет, сумма и касса — в платёжных полях.
    lines: [],
    amount: amountNumber || 0,
    paymentMethod,
    accountId: effectiveAccountId || null,
  })

  // Returns true if the form is valid enough to submit.
  const validate = (): boolean => {
    if (!counterpartyId) {
      showError(t('documents.counterpartyRequired'))
      return false
    }
    if (!effectiveCurrencyId) {
      showError(t('errors.codes.currencyRequired'))
      return false
    }
    if (!effectiveAccountId) {
      showError(t('errors.codes.accountRequired'))
      return false
    }
    // Сервер требует сумму > 0 и для черновика, поэтому проверяем её всегда.
    if (!(amountNumber > 0)) {
      showError(t(amount.trim() ? 'errors.codes.amountPositive' : 'errors.codes.amountRequired'))
      return false
    }
    return true
  }

  /** Сохраняет черновик: существующий — PUT, новый — POST. Возвращает id документа. */
  const saveDraft = async (): Promise<number> => {
    const data = buildUpdatePayload()
    if (savedDocId) {
      await updateDoc.mutateAsync({ id: savedDocId, data })
      return savedDocId
    }
    const created = await createDoc.mutateAsync({
      ...data,
      type,
      ...(isAdmin ? { branchId: activeBranch?.id ?? null } : {}),
    })
    return created.id
  }

  const handleSaveDraft = async () => {
    if (!validate()) return
    try {
      await saveDraft()
      toast.success(t('documents.draftSaved'))
      navigate(listRoute)
    } catch (err) {
      showError(getApiErrorMessage(err, t))
    }
  }

  const handleConfirm = async () => {
    if (!validate()) return
    try {
      const id = await saveDraft()
      await confirmDoc.mutateAsync(id)
      toast.success(t('documents.confirmed'))
      navigate(listRoute)
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

  const isBusy = createDoc.isPending || updateDoc.isPending || confirmDoc.isPending
  const isBlocked = adminNoBranch && !existingDoc

  if (currenciesLoading || docLoading) return <PaymentFormSkeleton />

  const inputCls = cn(
    'h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-[hsl(var(--text-primary))]',
    'placeholder:text-[hsl(var(--text-muted))]',
    'focus:outline-none focus:ring-1 focus:ring-brand-500/60 focus:border-brand-500/40 transition-colors',
  )

  const labelCls = 'text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]'
  const cpLabel = cpType === 'Customer' ? t('counterparties.Customer') : t('counterparties.Supplier')

  return (
    <div className={cn('flex flex-col h-full bg-background text-[hsl(var(--text-primary))] relative', className)}>
      {/* Title bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[hsl(var(--text-primary))]">
            {existingDoc ? t(type === 'PayOut' ? 'payments.viewPayOut' : 'payments.viewPayIn') : title}
          </h1>
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
              disabled={isBusy || isBlocked}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 h-8 text-xs text-[hsl(var(--text-muted))]',
                'hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}>
              <Save className="h-3.5 w-3.5" />
              {t('documents.saveDraft')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBusy || isBlocked || !counterpartyId || !(amountNumber > 0)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 h-8 text-xs text-brand-fg font-medium',
                'hover:bg-brand-500 active:bg-brand-700 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}>
              {confirmDoc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              {t('payments.confirm')}
            </button>
          </div>
        )}
      </div>

      {/* Form card */}
      <div className="flex flex-1 items-start justify-center px-6 py-4">
        <div className={cn(
          'w-full max-w-lg rounded-2xl border border-border bg-card p-6',
          'flex flex-col gap-4',
        )}>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>{t('common.date')}</span>
            <DatePicker
              value={date}
              onChange={(v) => { setDate(v); setManualRate(null) }}
              disabled={isReadonly}
              className="h-9"
            />
          </div>

          {/* Counterparty */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>{cpLabel}</span>
            <CounterpartyCombobox
              type={cpType}
              selectedId={counterpartyId}
              selectedName={counterpartyName}
              onSelect={(cp) => {
                setCounterpartyId(cp.id)
                setCounterpartyName(cp.name)
                setSelectedCp(cp)
              }}
              readOnly={isReadonly}
              label={cpLabel}
              placeholder={cpType === 'Customer' ? t('payments.selectCustomer') : t('payments.selectSupplier')}
              className={inputCls}
              optionClassName="text-sm"
            />
            {selectedCp && selectedCp.id === counterpartyId && (
              <p className="text-xs text-[hsl(var(--text-muted))]">
                {t('payments.balance')}:{' '}
                <span className={cn(
                  'font-mono',
                  selectedCp.balance > 0 ? 'text-red-400' : selectedCp.balance < 0 ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]',
                )}>
                  {fmt(selectedCp.balance)}
                </span>
              </p>
            )}
          </div>

          {/* Amount + Currency row */}
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className={labelCls}>{t('common.amount')}</span>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={isReadonly}
                className={cn(inputCls, 'font-mono', isReadonly && 'opacity-70 cursor-default')}
              />
            </label>
            <div className="flex flex-col gap-1 w-24">
              <span className={labelCls}>{t('common.currency')}</span>
              <Select
                value={effectiveCurrencyId}
                onValueChange={(id) => { setCurrencyId(id); setManualRate(null) }}
                disabled={isReadonly}
              >
                <SelectTrigger className="h-9" aria-label={t('common.currency')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isBaseCurrency && (
              <label className="flex flex-col gap-1 w-28">
                <span className={labelCls}>{t('documents.rate')}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={exchangeRate}
                  onChange={(e) => setManualRate(parseFloat(e.target.value) || 1)}
                  readOnly={isReadonly}
                  className={cn(inputCls, 'font-mono', isReadonly && 'opacity-70 cursor-default')}
                />
              </label>
            )}
          </div>

          {!isBaseCurrency && !isReadonly && manualRate == null && !rateLoading && autoRate == null && (
            <p className="text-xs text-orange-400 -mt-2">{t('documents.rateNotFound')}</p>
          )}

          {/* Amount in base */}
          {!isBaseCurrency && amountInBase > 0 && (
            <p className="text-xs text-[hsl(var(--text-muted))] -mt-2">
              {t('payments.inBaseCurrency')}:{' '}
              <span className="font-mono text-[hsl(var(--text-primary))]">{fmt(amountInBase)} {baseCurrency?.code ?? ''}</span>
            </p>
          )}

          {/* Payment method */}
          <div className="flex flex-col gap-1" role="radiogroup" aria-label={t('payments.paymentMethod')}>
            <span className={labelCls}>{t('payments.paymentMethod')}</span>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === value}
                  onClick={() => { if (!isReadonly) setPaymentMethod(value) }}
                  disabled={isReadonly}
                  className={cn(
                    'flex-1 h-9 rounded-lg border text-xs font-medium transition-colors',
                    paymentMethod === value
                      ? 'border-brand-500/40 bg-brand-500/15 text-brand-400'
                      : 'border-border bg-secondary text-[hsl(var(--text-muted))]',
                    !isReadonly && paymentMethod !== value && 'hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                    isReadonly && 'cursor-default disabled:opacity-100',
                  )}
                >
                  {t(`payments.${value}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className="flex flex-col gap-1">
            <span className={labelCls}>{t('payments.account')}</span>
            {isReadonly ? (
              <div className={cn(inputCls, 'flex items-center opacity-70 cursor-default')}>
                {existingDoc?.accountName ?? '—'}
              </div>
            ) : (
              <>
                <Select value={effectiveAccountId} onValueChange={setAccountId} disabled={availableAccounts.length === 0}>
                  <SelectTrigger className="h-9" aria-label={t('payments.account')}>
                    <SelectValue placeholder={t('payments.selectAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableAccounts.length === 0 && !isBlocked && (
                  <p className="text-xs text-orange-400">
                    {t('payments.noAccounts', { currency: baseCurrency?.code ?? '' })}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Note */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>{t('common.note')}</span>
            <textarea
              placeholder={t('payments.noteOptional')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              readOnly={isReadonly}
              rows={2}
              className={cn(
                'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-[hsl(var(--text-primary))]',
                'placeholder:text-[hsl(var(--text-muted))] resize-none',
                'focus:outline-none focus:ring-1 focus:ring-brand-500/60 focus:border-brand-500/40 transition-colors',
                isReadonly && 'opacity-70 cursor-default',
              )}
            />
          </label>

          {/* Summary */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-background p-3 flex items-center justify-between">
            <span className="text-sm text-[hsl(var(--text-muted))]">{type === 'PayOut' ? t('payments.totalToPay') : t('payments.totalToReceive')}:</span>
            <span className="font-mono font-semibold text-brand-400 text-lg">
              {amount ? fmt(amountNumber || 0) : '0'} {selectedCurrency?.code ?? ''}
            </span>
          </div>
        </div>
      </div>

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
