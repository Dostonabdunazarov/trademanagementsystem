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
        'flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 light:border-orange-300 light:bg-orange-50',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400 light:text-orange-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-orange-300 light:text-orange-800">{t('dashboard.stockAlerts')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {lowItems.map(({ productId, productName, quantity, unit, branchId, branchName }) => (
            <span
              key={`${productId}:${branchId}`}
              className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-300 light:border-orange-300 light:bg-orange-100 light:text-orange-900"
            >
              {productName}{showBranch && branchName ? ` (${branchName})` : ''} —{' '}
              <span className="font-mono font-semibold">{quantity} {t(`products.units.${unit}`, { defaultValue: unit })}</span>
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-orange-500 hover:bg-orange-500/10 hover:text-orange-300 light:text-orange-700 light:hover:bg-orange-100 light:hover:text-orange-900 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
