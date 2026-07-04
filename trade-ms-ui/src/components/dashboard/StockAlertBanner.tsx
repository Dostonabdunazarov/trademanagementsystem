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

  const lowItems = (data?.lines ?? []).filter((item) => item.quantity <= LOW_STOCK_THRESHOLD)

  if (dismissed || lowItems.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-[#ee8800]/40 bg-[#ee8800]/10 p-4 dark:border-amber-500/20 dark:bg-amber-500/5',
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ee8800] dark:text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-[#ee8800] dark:text-amber-300">{t('dashboard.stockAlerts')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {lowItems.map(({ productId, productName, quantity, unit }) => (
            <span
              key={productId}
              className="rounded-full border border-[#ee8800]/40 bg-[#ee8800]/15 px-2.5 py-0.5 text-xs text-[#ee8800] dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {productName} — <span className="font-mono font-semibold">{quantity} {unit}</span>
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-[#ee8800] hover:bg-[#ee8800]/15 hover:text-[#ee8800] dark:text-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-300 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
