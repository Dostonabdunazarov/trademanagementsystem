import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentType, PaymentMethod } from '@/types/document'
import { useCounterparties } from '@/api/hooks/useCounterparties'
import { useCurrencies } from '@/api/hooks/useCurrencies'
import { useAccounts } from '@/api/hooks/useAccounts'
import { useCreateDocument, useConfirmDocument } from '@/api/hooks/useDocumentMutations'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function counterpartyTypeFor(type: DocumentType): 'Customer' | 'Supplier' {
  return type === 'PayIn' ? 'Supplier' : 'Customer'
}

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
  isLoading?: boolean
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export function PaymentForm({ type, title, className, isLoading = false }: PaymentFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const navigate = useNavigate()

  const createDoc = useCreateDocument()
  const confirmDoc = useConfirmDocument()

  const { user } = useAuthStore()
  const { activeBranch } = useUiStore()
  const isAdmin = user?.role === 'Admin'
  const adminNoBranch = isAdmin && !activeBranch

  const cpType = counterpartyTypeFor(type)

  const [cpSearch, setCpSearch] = useState('')
  const { data: cpData } = useCounterparties(cpType, cpSearch)
  const counterparties = cpData?.items ?? []

  const { data: currencies = [] } = useCurrencies()
  const { data: accounts = [] } = useAccounts()

  const baseCurrency = currencies.find((c) => c.isBase) ?? currencies[0]

  const [date, setDate] = useState(today)
  const [counterpartyId, setCounterpartyId] = useState('')
  const [counterpartyName, setCounterpartyName] = useState('')
  const [cpOpen, setCpOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')

  // Init currencyId and accountId once data loads
  useEffect(() => {
    if (currencies.length && !currencyId) {
      const base = currencies.find((c) => c.isBase) ?? currencies[0]
      setCurrencyId(base.id)
    }
  }, [currencies, currencyId])

  useEffect(() => {
    if (accounts.length && !accountId) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  const cpRef = useRef<HTMLDivElement>(null)

  const selectedCurrency = currencies.find((c) => c.id === currencyId) ?? baseCurrency
  const isBaseCurrency = baseCurrency ? currencyId === baseCurrency.id : true

  const selectedCp = counterparties.find((c) => c.id === counterpartyId) ?? null

  const amountInBase = useMemo(() => {
    const n = parseFloat(amount)
    if (isNaN(n)) return 0
    return isBaseCurrency ? n : n * exchangeRate
  }, [amount, exchangeRate, isBaseCurrency])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cpRef.current && !cpRef.current.contains(e.target as Node)) {
        setCpOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCurrencyChange = useCallback((id: string) => {
    const cur = currencies.find((c) => c.id === id)
    if (!cur) return
    setCurrencyId(cur.id)
    setExchangeRate(1)
  }, [currencies])

  const listRoute = type === 'PayOut' ? '/pay-outs' : '/pay-ins'

  const buildPayload = () => ({
    type,
    date,
    ...(isAdmin ? { branchId: activeBranch?.id ?? null } : {}),
    counterpartyId: counterpartyId || null,
    currencyId,
    exchangeRate,
    discountPercent: 0,
    note: note || null,
    lines: [],
    amount: parseFloat(amount) || 0,
    paymentMethod,
    accountId: accountId || null,
  })

  const handleSaveDraft = async () => {
    await createDoc.mutateAsync(buildPayload())
    navigate(listRoute)
  }

  const handleConfirm = async () => {
    const doc = await createDoc.mutateAsync(buildPayload())
    await confirmDoc.mutateAsync(doc.id)
    navigate(listRoute)
  }

  const isBusy = createDoc.isPending || confirmDoc.isPending
  const isBlocked = adminNoBranch

  if (isLoading) return <PaymentFormSkeleton />

  const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'Cash',          label: 'Наличные'     },
    { value: 'BankTransfer',  label: 'Банк. перевод' },
    { value: 'Card',          label: 'Карта'         },
  ]

  const inputCls = cn(
    'h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-[hsl(var(--text-primary))]',
    'placeholder:text-[hsl(var(--text-muted))]',
    'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-colors',
  )

  const labelCls = 'text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]'

  return (
    <div className={cn('flex flex-col h-full bg-background text-[hsl(var(--text-primary))]', className)}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <h1 className="text-base font-semibold text-[hsl(var(--text-primary))]">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isBusy || isBlocked}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 h-8 text-xs text-[hsl(var(--text-muted))]',
              'hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}>
            <Save className="h-3.5 w-3.5" />
            Сохранить черновик
          </button>
          <button
            onClick={handleConfirm}
            disabled={isBusy || isBlocked || !counterpartyId || !amount}
            className={cn(
              'flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 h-8 text-xs text-white font-medium',
              'hover:bg-indigo-500 active:bg-indigo-700 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}>
            <CheckCircle className="h-3.5 w-3.5" />
            Провести
          </button>
        </div>
      </div>

      {/* Form card */}
      <div className="flex flex-1 items-start justify-center px-6 py-4">
        <div className={cn(
          'w-full max-w-lg rounded-2xl border border-border bg-card p-6',
          'flex flex-col gap-4',
        )}>

          {/* Date */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Дата</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </label>

          {/* Counterparty */}
          <div className="flex flex-col gap-1" ref={cpRef}>
            <span className={labelCls}>{cpType === 'Customer' ? 'Клиент' : 'Поставщик'}</span>
            <div className="relative">
              <input
                type="text"
                placeholder={`Выберите ${cpType === 'Customer' ? 'клиента' : 'поставщика'}...`}
                value={cpSearch || counterpartyName}
                onFocus={() => { setCpSearch(''); setCpOpen(true) }}
                onChange={(e) => { setCpSearch(e.target.value); setCpOpen(true) }}
                className={inputCls}
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
                        setCounterpartyId(cp.id)
                        setCounterpartyName(cp.name)
                        setCpSearch('')
                        setCpOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[hsl(var(--surface-2))] transition-colors',
                        counterpartyId === cp.id ? 'text-indigo-400' : 'text-[hsl(var(--text-primary))]',
                      )}
                    >
                      <span className="truncate">{cp.name}</span>
                      <span className={cn(
                        'font-mono text-xs ml-2 shrink-0',
                        cp.balance > 0 ? 'text-red-400' : cp.balance < 0 ? 'text-emerald-400' : 'text-[hsl(var(--text-muted))]',
                      )}>
                        {fmt(cp.balance)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCp && (
              <p className="text-xs text-[hsl(var(--text-muted))]">
                Баланс:{' '}
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
              <span className={labelCls}>Сумма</span>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(inputCls, 'font-mono')}
              />
            </label>
            <label className="flex flex-col gap-1 w-24">
              <span className={labelCls}>Валюта</span>
              <select
                value={currencyId}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className={cn(inputCls)}
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </select>
            </label>
            {!isBaseCurrency && (
              <label className="flex flex-col gap-1 w-28">
                <span className={labelCls}>Курс</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                  className={cn(inputCls, 'font-mono')}
                />
              </label>
            )}
          </div>

          {/* Amount in base */}
          {!isBaseCurrency && amountInBase > 0 && (
            <p className="text-xs text-[hsl(var(--text-muted))] -mt-2">
              В базовой валюте:{' '}
              <span className="font-mono text-[hsl(var(--text-primary))]">{fmt(amountInBase)} {baseCurrency?.code ?? ''}</span>
            </p>
          )}

          {/* Payment method */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Метод оплаты</span>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={cn(
                    'flex-1 h-9 rounded-lg border text-xs font-medium transition-colors',
                    paymentMethod === value
                      ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-400'
                      : 'border-border bg-secondary text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>

          {/* Account (Касса) */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Касса / Счёт</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={inputCls}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </label>

          {/* Note */}
          <label className="flex flex-col gap-1">
            <span className={labelCls}>Примечание</span>
            <textarea
              placeholder="Необязательно..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={cn(
                'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-[hsl(var(--text-primary))]',
                'placeholder:text-[hsl(var(--text-muted))] resize-none',
                'focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-colors',
              )}
            />
          </label>

          {/* Summary */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-background p-3 flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--text-muted))]">Итого к {type === 'PayOut' ? 'оплате' : 'получению'}:</span>
            <span className="font-mono font-semibold text-indigo-400">
              {amount ? fmt(parseFloat(amount) || 0) : '0'} {selectedCurrency?.code ?? ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
