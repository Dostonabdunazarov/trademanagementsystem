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
            className="hidden items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1 text-xs sm:flex"
          >
            <span className="font-semibold text-[hsl(var(--text-muted))]">{Ccy}</span>
            <span className="font-semibold tabular-nums text-[hsl(var(--text-primary))]">{formatRate(Rate)}</span>
            <span
              className={cn(
                'flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                isUp ? 'text-[var(--positive)]' : 'text-[var(--negative)]',
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
              {isUp ? '+' : '−'}{Math.abs(diff).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
