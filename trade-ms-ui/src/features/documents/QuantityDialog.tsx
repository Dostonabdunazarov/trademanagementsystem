import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityDialogProps {
  productName: string
  stock: number
  unit: string
  defaultPrice: number
  onConfirm: (qty: number, price: number, discount: number) => void
  onClose: () => void
}

/**
 * Ввод количества, цены и скидки для строки документа. Монтируется при каждом
 * открытии, поэтому поля инициализируются из пропсов. Модальный диалог:
 * фокус в поле количества, Tab не уходит за пределы окна, Esc закрывает,
 * после закрытия фокус возвращается туда, откуда диалог открыли.
 */
export function QuantityDialog({
  productName,
  stock,
  unit,
  defaultPrice,
  onConfirm,
  onClose,
}: QuantityDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const descId = useId()
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState(String(defaultPrice))
  const [discount, setDiscount] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const unitLabel = t(`products.units.${unit}`, { defaultValue: unit })

  // Фокус внутрь при открытии и обратно при закрытии.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    qtyRef.current?.focus()
    qtyRef.current?.select()
    return () => previouslyFocused?.focus?.()
  }, [])

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>('input, button:not([disabled])')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function handleConfirm() {
    const q = parseFloat(qty)
    const p = parseFloat(price)
    const d = parseFloat(discount)
    if (isNaN(q) || q <= 0) return setError(t('errors.codes.lineQuantityPositive'))
    if (unit === 'Pcs' && !Number.isInteger(q)) return setError(t('errors.codes.lineQuantityInteger'))
    if (isNaN(p) || p < 0) return setError(t('errors.codes.linePriceNonNegative'))
    if (!isNaN(d) && (d < 0 || d > 100)) return setError(t('errors.codes.discountRange'))
    onConfirm(q, p, isNaN(d) ? 0 : d)
  }

  const inputCls = cn(
    'h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm font-mono',
    'text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]',
    'focus:outline-none focus:ring-1 focus:ring-brand-500/60 focus:border-brand-500/40',
    'transition-colors',
  )

  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleConfirm() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={onKeyDown}
        className={cn(
          'relative z-10 w-full max-w-sm rounded-2xl border border-[hsl(var(--border))]',
          'bg-card/95 backdrop-blur-xl shadow-2xl shadow-foreground/30',
          'p-5 flex flex-col gap-4',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 id={titleId} className="text-sm font-semibold text-[hsl(var(--text-primary))] leading-snug">{productName}</h3>
            <p id={descId} className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
              {t('products.stock')}: <span className="text-[hsl(var(--text-primary))] font-mono">{stock}</span>{' '}
              <span className="text-[hsl(var(--text-muted))]">{unitLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="shrink-0 rounded-md p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[hsl(var(--text-muted))]">{t('common.quantity')} ({unitLabel})</span>
            <input
              ref={qtyRef}
              type="number"
              min={unit === 'Pcs' ? '1' : '0.001'}
              step={unit === 'Pcs' ? '1' : 'any'}
              value={qty}
              onChange={(e) => { setQty(e.target.value); setError(null) }}
              onKeyDown={onEnter}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[hsl(var(--text-muted))]">{t('common.price')}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setError(null) }}
              onKeyDown={onEnter}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[hsl(var(--text-muted))]">{t('documents.discount')} %</span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={discount}
              onChange={(e) => { setDiscount(e.target.value); setError(null) }}
              onKeyDown={onEnter}
              className={inputCls}
            />
          </label>
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              'flex-1 h-9 rounded-lg bg-brand-600 text-sm font-medium text-brand-fg',
              'hover:bg-brand-500 active:bg-brand-700 transition-colors',
            )}
          >
            OK <span className="text-brand-300 text-xs ml-1" aria-hidden>Enter</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-1 h-9 rounded-lg border border-border bg-secondary text-sm text-[hsl(var(--text-muted))]',
              'hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors',
            )}
          >
            {t('common.cancel')} <span className="text-[hsl(var(--text-muted))] text-xs ml-1" aria-hidden>Esc</span>
          </button>
        </div>
      </div>
    </div>
  )
}
