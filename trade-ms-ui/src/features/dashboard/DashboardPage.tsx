import { TrendingUp, DollarSign, Users, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MetricCard } from '@/components/dashboard/MetricCard'
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
  const { data, isLoading } = useDashboardSummary(activeBranch?.id)
  const { t } = useTranslation()

  const metrics = [
    {
      title: t('dashboard.revenueMonth'),
      value: isLoading ? '…' : formatNumber(data?.revenueMonth ?? 0),
      delta: undefined,
      icon: TrendingUp,
      iconColor: 'text-indigo-400',
    },
    {
      title: t('dashboard.profitMonth'),
      value: isLoading ? '…' : formatNumber(data?.profitMonth ?? 0),
      delta: undefined,
      icon: DollarSign,
      iconColor: 'text-emerald-400',
    },
    {
      title: t('dashboard.debtorDebt'),
      value: isLoading ? '…' : formatNumber(data?.debtorDebt ?? 0),
      delta: undefined,
      icon: Users,
      iconColor: 'text-amber-400',
    },
    {
      title: t('dashboard.stockItems'),
      value: isLoading ? '…' : `${(data?.stockItemCount ?? 0).toLocaleString('ru-RU')} ед.`,
      delta: undefined,
      icon: Package,
      iconColor: 'text-violet-400',
    },
  ]

  return (
    <div className="relative min-h-full p-6 pb-24">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/3 h-96 w-96 rounded-full bg-indigo-500/5 blur-[120px]"
      />

      {/* Metric cards — 4-col */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      {/* Row 2: Revenue chart + Counterparty widget */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RevenueChart className="lg:col-span-8" monthlySales={data?.monthlySales} loading={isLoading} />
        <CounterpartyBalanceWidget className="lg:col-span-4" />
      </div>

      {/* Row 3: TopProducts + ActivityFeed */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <TopProductsTable className="lg:col-span-7" />
        <ActivityFeed className="lg:col-span-5" />
      </div>

      {/* Row 4: Stock alert banner */}
      <StockAlertBanner className="mt-4" />

      {/* Floating quick action bar */}
      <QuickActionBar />
    </div>
  )
}
