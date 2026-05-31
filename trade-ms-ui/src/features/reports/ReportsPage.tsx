import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Package, Users } from 'lucide-react'
import { SalesSummaryReport } from './SalesSummaryReport'
import { StockBalanceReport } from './StockBalanceReport'
import { CounterpartyBalanceReport } from './CounterpartyBalanceReport'
import { cn } from '@/lib/utils'

type TabId = 'sales' | 'stock' | 'counterparty'

export function ReportsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('sales')

  const TABS = [
    { id: 'sales' as TabId, label: t('reports.sales'), icon: BarChart3, description: t('reports.revenue') },
    { id: 'stock' as TabId, label: t('reports.stock'), icon: Package, description: t('reports.stockBalance') },
    { id: 'counterparty' as TabId, label: t('reports.balances'), icon: Users, description: t('reports.counterparty') },
  ]

  const currentTab = TABS.find((tab) => tab.id === activeTab)!

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">{t('reports.title')}</h1>
        <p className="text-sm text-[hsl(var(--text-muted))] mt-0.5">{currentTab.description}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-[hsl(var(--border))] bg-card p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25'
                  : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'sales' && <SalesSummaryReport />}
        {activeTab === 'stock' && <StockBalanceReport />}
        {activeTab === 'counterparty' && <CounterpartyBalanceReport />}
      </div>
    </div>
  )
}
