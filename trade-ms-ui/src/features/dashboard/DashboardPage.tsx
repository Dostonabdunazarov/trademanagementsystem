import { useState, type CSSProperties } from 'react'
import { format, parseISO } from 'date-fns'
import { TrendingUp, DollarSign, Users, CreditCard } from 'lucide-react'
import { ru, uz } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PeriodFilter } from '@/components/dashboard/PeriodFilter'
import { defaultPeriod, type PeriodRange } from '@/components/dashboard/period'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopProductsTable } from '@/components/dashboard/TopProductsTable'
import { CounterpartyBalanceWidget } from '@/components/dashboard/CounterpartyBalanceWidget'
import { StockAlertBanner } from '@/components/dashboard/StockAlertBanner'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useDocumentHotkeys } from '@/components/dashboard/useDocumentHotkeys'
import { DailyRevenueChart } from '@/components/dashboard/DailyRevenueChart'
import { MarginChart } from '@/components/dashboard/MarginChart'
import { SalesStructureChart } from '@/components/dashboard/SalesStructureChart'
import { ProductProfitChart } from '@/components/dashboard/ProductProfitChart'
import { StockByGroupChart } from '@/components/dashboard/StockByGroupChart'
import { DebtBalanceWidget } from '@/components/dashboard/DebtBalanceWidget'
import { StockForecastWidget } from '@/components/dashboard/StockForecastWidget'
import { useDashboardSummary, useSalesSummary, useStockBalance } from '@/api/hooks/useReports'
import { formatNumber } from '@/utils/format'
import { useUiStore } from '@/store/ui.store'

export function DashboardPage() {
  const { activeBranch } = useUiStore()
  const [period, setPeriod] = useState<PeriodRange>(defaultPeriod)
  const { data, isLoading } = useDashboardSummary({
    branchId: activeBranch?.id,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
  })
  // Структура и прибыльность товаров — за тот же период, что и карточки.
  const sales = useSalesSummary({ branchId: activeBranch?.id, dateFrom: period.dateFrom, dateTo: period.dateTo })
  const stock = useStockBalance(activeBranch?.id)
  const { t, i18n } = useTranslation()
  useDocumentHotkeys()

  // Каскад появления блоков сверху вниз.
  const delay = (ms: number) => ({ '--delay': `${ms}ms` } as CSSProperties)

  const locale = i18n.language.startsWith('uz') ? uz : ru
  const comparedRange = (from: string, to: string) => {
    const a = parseISO(from)
    const b = parseISO(to)
    if (format(a, 'yyyy-MM') === format(b, 'yyyy-MM')) {
      return from === to
        ? format(a, 'd MMM', { locale })
        : `${format(a, 'd')}–${format(b, 'd MMM', { locale })}`
    }
    const pattern = a.getFullYear() === b.getFullYear() ? 'd MMM' : 'd MMM yyyy'
    return `${format(a, pattern, { locale })} – ${format(b, pattern, { locale })}`
  }
  const vsPrev = data?.comparedFrom && data?.comparedTo
    ? t('dashboard.vsRange', { range: comparedRange(data.comparedFrom, data.comparedTo) })
    : t('dashboard.vsPrevPeriod')

  // Helper: convert nullable delta (number | null) to MetricCard's optional prop
  const delta = (value: number | null | undefined) => (value == null ? undefined : value)

  // Row 1 — primary period metrics with deltas vs the previous comparable period
  const metrics = [
    {
      title: t('dashboard.revenueMonth'),
      value: '…',
      amount: isLoading ? undefined : (data?.revenue ?? 0),
      delta: delta(data?.revenueDelta),
      deltaLabel: vsPrev,
      icon: TrendingUp,
      iconColor: 'text-[var(--chart-1)]',
    },
    {
      title: t('dashboard.profitMonth'),
      value: '…',
      amount: isLoading ? undefined : (data?.profit ?? 0),
      delta: delta(data?.profitDelta),
      deltaLabel: vsPrev,
      icon: DollarSign,
      iconColor: 'text-[var(--positive)]',
    },
    {
      title: `${t('dashboard.debtorDebt')} · ${t('dashboard.debtTotalHint')}`,
      value: '…',
      amount: isLoading ? undefined : (data?.debtorDebt ?? 0),
      delta: undefined,
      icon: Users,
      iconColor: 'text-[var(--chart-3)]',
    },
    {
      title: `${t('dashboard.creditorDebt')} · ${t('dashboard.debtTotalHint')}`,
      value: '…',
      amount: isLoading ? undefined : (data?.creditorDebt ?? 0),
      delta: undefined,
      icon: CreditCard,
      iconColor: 'text-[var(--chart-4)]',
    },
  ]

  return (
    <div className="relative min-h-full p-6">
      {/* Period filter — applies to revenue & profit */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))]">
          {t('dashboard.period')}
        </span>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Metric cards — 4-col */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <MetricCard
            key={m.title}
            {...m}
            formatAmount={formatNumber}
            className="anim-rise"
            style={{ '--delay': `${i * 70}ms` } as CSSProperties}
          />
        ))}
      </div>

      {/* Row 2: Revenue chart + Counterparty widget */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RevenueChart className="anim-rise [--delay:280ms] lg:col-span-8" monthlySales={data?.monthlySales} loading={isLoading} />
        <CounterpartyBalanceWidget className="anim-rise [--delay:350ms] lg:col-span-4" />
      </div>

      {/* Row 3: выручка по дням + баланс долгов */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <DailyRevenueChart className="anim-rise lg:col-span-8" style={delay(420)} dailySales={data?.dailySales} loading={isLoading} />
        <DebtBalanceWidget
          className="anim-rise lg:col-span-4"
          style={delay(490)}
          debtorDebt={data?.debtorDebt}
          creditorDebt={data?.creditorDebt}
          loading={isLoading}
        />
      </div>

      {/* Row 4: маржинальность, структура продаж, прогноз остатков */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MarginChart className="anim-rise" style={delay(560)} monthlySales={data?.monthlySales} loading={isLoading} />
        <SalesStructureChart className="anim-rise" style={delay(630)} lines={sales.data?.lines} loading={sales.isLoading} />
        <StockForecastWidget className="anim-rise md:col-span-2 xl:col-span-1" style={delay(700)} branchId={activeBranch?.id} />
      </div>

      {/* Row 5: прибыльность товаров + склад по группам */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ProductProfitChart className="anim-rise lg:col-span-7" style={delay(770)} lines={sales.data?.lines} loading={sales.isLoading} />
        <StockByGroupChart className="anim-rise lg:col-span-5" style={delay(840)} lines={stock.data?.lines} loading={stock.isLoading} />
      </div>

      {/* Row 6: TopProducts + ActivityFeed */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <TopProductsTable className="anim-rise [--delay:910ms] lg:col-span-7" />
        <ActivityFeed className="anim-rise [--delay:980ms] lg:col-span-5" />
      </div>

      {/* Row 4: Stock alert banner */}
      <StockAlertBanner className="anim-rise [--delay:1050ms] mt-4" />
    </div>
  )
}
