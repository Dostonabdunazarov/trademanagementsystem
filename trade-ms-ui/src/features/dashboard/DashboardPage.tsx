import { useState, type CSSProperties } from 'react'
import { TrendingUp, DollarSign, Users, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PeriodFilter, defaultPeriod, type PeriodRange } from '@/components/dashboard/PeriodFilter'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopProductsTable } from '@/components/dashboard/TopProductsTable'
import { CounterpartyBalanceWidget } from '@/components/dashboard/CounterpartyBalanceWidget'
import { StockAlertBanner } from '@/components/dashboard/StockAlertBanner'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { QuickActionBar } from '@/components/dashboard/QuickActionBar'
import { useDashboardSummary } from '@/api/hooks/useReports'
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
  const { t } = useTranslation()

  const vsPrev = t('dashboard.vsPrevPeriod')

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
      iconColor: 'text-brand-400',
    },
    {
      title: t('dashboard.profitMonth'),
      value: '…',
      amount: isLoading ? undefined : (data?.profit ?? 0),
      delta: delta(data?.profitDelta),
      deltaLabel: vsPrev,
      icon: DollarSign,
      iconColor: 'text-emerald-400',
    },
    {
      title: `${t('dashboard.debtorDebt')} · ${t('dashboard.debtTotalHint')}`,
      value: '…',
      amount: isLoading ? undefined : (data?.debtorDebt ?? 0),
      delta: undefined,
      icon: Users,
      iconColor: 'text-orange-400',
    },
    {
      title: `${t('dashboard.creditorDebt')} · ${t('dashboard.debtTotalHint')}`,
      value: '…',
      amount: isLoading ? undefined : (data?.creditorDebt ?? 0),
      delta: undefined,
      icon: CreditCard,
      iconColor: 'text-rose-400',
    },
  ]

  return (
    <div className="relative min-h-full p-6 pb-24">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/3 h-96 w-96 rounded-full bg-brand-500/5 blur-[120px]"
      />

      {/* Period filter — applies to revenue & profit */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--text-muted))]">
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

      {/* Row 3: TopProducts + ActivityFeed */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <TopProductsTable className="anim-rise [--delay:420ms] lg:col-span-7" />
        <ActivityFeed className="anim-rise [--delay:490ms] lg:col-span-5" />
      </div>

      {/* Row 4: Stock alert banner */}
      <StockAlertBanner className="anim-rise [--delay:560ms] mt-4" />

      {/* Floating quick action bar */}
      <QuickActionBar />
    </div>
  )
}
