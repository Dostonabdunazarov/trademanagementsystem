import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const SHOW_CURRENCIES = ['USD', 'EUR', 'RUB']

interface CbuRate {
  Ccy: string
  Rate: string
  Diff: string
}

async function fetchCbuRates(): Promise<CbuRate[]> {
  const res = await fetch('https://cbu.uz/oz/arkhiv-kursov-valyut/json/')
  if (!res.ok) throw new Error('CBU fetch failed')
  const data: CbuRate[] = await res.json()
  return data.filter((r) => SHOW_CURRENCIES.includes(r.Ccy))
}

function formatRate(rate: string) {
  return Number(rate).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

export function CurrencyRateTicker({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery<CbuRate[]>({
    queryKey: ['cbu-rates'],
    queryFn: fetchCbuRates,
    staleTime: 5 * 60_000, // 5 minutes
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-[hsl(var(--text-muted))]', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">{t('dashboard.ratesLoading')}</span>
      </div>
    )
  }

  if (isError || !data) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {data.map(({ Ccy, Rate, Diff }) => {
        const diff = parseFloat(Diff)
        const isUp = diff >= 0
        return (
          <div
            key={Ccy}
            className={cn(
              'hidden items-center gap-1.5 sm:flex px-2.5 py-1 rounded-lg border text-xs transition-colors',
              isUp
                ? 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                : 'bg-red-500/10 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/20',
            )}
          >
            <span className="font-bold text-[hsl(var(--text-muted))]">{Ccy}</span>
            <span className="font-mono tabular-nums font-semibold text-[hsl(var(--text-primary))]">{formatRate(Rate)}</span>
            <span
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-mono tabular-nums font-semibold',
                isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUp ? '+' : ''}{diff.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
