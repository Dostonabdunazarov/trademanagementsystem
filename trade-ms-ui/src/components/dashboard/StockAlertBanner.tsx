import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useStockBalance } from '@/api/hooks/useReports'
import { useUiStore } from '@/store/ui.store'

const LOW_STOCK_THRESHOLD = 5

export function StockAlertBanner({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  const { activeBranch } = useUiStore()
  const { data } = useStockBalance(activeBranch?.id)
  // Без выбранного филиала один товар приходит строкой на каждый филиал.
  const showBranch = !activeBranch

  const lowItems = (data?.lines ?? []).filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)

  if (dismissed || lowItems.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-[var(--warning-c)]/30 bg-[var(--warning-c)]/5 p-4',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-c)]" />
      <div className="flex-1">
        <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{t('dashboard.stockAlerts')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {lowItems.map(({ productId, productName, quantity, unit, branchId, branchName }) => (
            <span
              key={`${productId}:${branchId}`}
              className="rounded-full border border-[hsl(var(--border))] bg-card px-2.5 py-0.5 text-xs text-[hsl(var(--text-primary))]"
            >
              {productName}{showBranch && branchName ? ` (${branchName})` : ''} —{' '}
              <span className="font-semibold">{quantity} {t(`products.units.${unit}`, { defaultValue: unit })}</span>
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors"
        aria-label={t('common.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
