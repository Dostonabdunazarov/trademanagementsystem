import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useStockForecast } from '@/api/hooks/useReports'
import { cn } from '@/lib/utils'
import { ChartCard, ChartEmpty } from './ChartCard'

const LOOKBACK_DAYS = 30
/** Шкала полосы: запас на 30+ дней — полная полоса. */
const FULL_BAR_DAYS = 30

function tone(daysLeft: number) {
  if (daysLeft <= 7) return { text: 'text-red-400', bar: 'bg-red-500' }
  if (daysLeft <= 14) return { text: 'text-orange-400', bar: 'bg-orange-500' }
  return { text: 'text-emerald-400', bar: 'bg-emerald-500' }
}

interface Props {
  branchId?: string
  className?: string
  style?: CSSProperties
}

/** Прогноз остатков (п. 12): на сколько дней хватит товара при темпе продаж за 30 дней. */
export function StockForecastWidget({ branchId, className, style }: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useStockForecast({ branchId, days: LOOKBACK_DAYS, limit: 6 })
  const lines = data?.lines ?? []

  const daysLabel = (d: number) =>
    d <= 0 ? t('dashboard.outOfStock') : d < 1 ? t('dashboard.lessThanDay') : t('dashboard.daysLeft', { n: Math.round(d) })

  return (
    <ChartCard
      title={t('dashboard.stockForecast')}
      subtitle={t('dashboard.stockForecastHint', { days: LOOKBACK_DAYS })}
      loading={isLoading}
      bodyHeight={180}
      className={className}
      style={style}
    >
      {lines.length === 0 ? (
        <ChartEmpty text={t('dashboard.noForecast', { days: LOOKBACK_DAYS })} height={180} />
      ) : (
        <ul className="space-y-3">
          {lines.map((l, i) => {
            const c = tone(l.daysLeft)
            const unit = t(`products.units.${l.unit}`, { defaultValue: l.unit })
            return (
              <li key={l.productId} className="anim-rise" style={{ '--delay': `${450 + i * 60}ms` } as CSSProperties}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-[hsl(var(--text-primary))]">{l.productName}</span>
                  <span className={cn('shrink-0 font-mono font-semibold tabular-nums', c.text)}>{daysLabel(l.daysLeft)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                    <div
                      className={cn('anim-grow-x h-full rounded-full', c.bar)}
                      style={{ width: `${Math.min(1, l.daysLeft / FULL_BAR_DAYS) * 100}%`, '--delay': `${550 + i * 60}ms` } as CSSProperties}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[hsl(var(--text-muted))]">
                    {l.quantity.toLocaleString('ru-RU')} {unit} · {l.soldPerDay.toLocaleString('ru-RU')}{t('dashboard.perDay')}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </ChartCard>
  )
}
