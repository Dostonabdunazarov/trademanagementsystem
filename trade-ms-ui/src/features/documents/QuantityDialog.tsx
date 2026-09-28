import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityDialogProps {
  open: boolean
  productName: string
  stock: number
  unit: string
  defaultPrice: number
  onConfirm: (qty: number, price: number, discount: number) => void
  onClose: () => void
}

export function QuantityDialog({
  open,
  productName,
  stock,
  unit,
  defaultPrice,
  onConfirm,
  onClose,
}: QuantityDialogProps) {
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState(String(defaultPrice))
  const [discount, setDiscount] = useState('0')
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQty('1')
      setPrice(String(defaultPrice))
      setDiscount('0')
      setTimeout(() => qtyRef.current?.focus(), 50)
    }
  }, [open, defaultPrice])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleConfirm() {
    const q = parseFloat(qty)
    const p = parseFloat(price)
    const d = parseFloat(discount)
    if (isNaN(q) || q <= 0 || isNaN(p) || p < 0) return
    onConfirm(q, p, isNaN(d) ? 0 : d)
  }

  if (!open) return null

  const inputCls = cn(
    'h-9 w-full rounded-lg border border-border bg-secondary px-3 text-sm font-mono',
    'text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]',
    'focus:outline-none focus:ring-1 focus:ring-brand-500/60 focus:border-brand-500/40',
    'transition-colors',
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative z-10 w-full max-w-sm rounded-2xl border border-[hsl(var(--border))]',
          'bg-card/95 backdrop-blur-xl shadow-2xl shadow-foreground/30',
          'p-5 flex flex-col gap-4',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))] leading-snug">{productName}</h3>
            <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">
              Остаток: <span className="text-[hsl(var(--text-primary))] font-mono">{stock}</span>{' '}
              <span className="text-[hsl(var(--text-muted))]">{unit}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[hsl(var(--text-muted))]">Количество ({unit})</span>
            <input
              ref={qtyRef}
              type="number"
              min="0.001"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[hsl(var(--text-muted))]">Цена</span>
            <input
              type="number"
              min="0"
              step="100"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[hsl(var(--text-muted))]">Скидка %</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              className={inputCls}
            />
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleConfirm}
            className={cn(
              'flex-1 h-9 rounded-lg bg-brand-600 text-sm font-medium text-brand-fg',
              'hover:bg-brand-500 active:bg-brand-700 transition-colors',
            )}
          >
            OK <span className="text-brand-300 text-xs ml-1">Enter</span>
          </button>
          <button
            onClick={onClose}
            className={cn(
              'flex-1 h-9 rounded-lg border border-border bg-secondary text-sm text-[hsl(var(--text-muted))]',
              'hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors',
            )}
          >
            Отмена <span className="text-[hsl(var(--text-muted))] text-xs ml-1">Esc</span>
          </button>
        </div>
      </div>
    </div>
  )
}
