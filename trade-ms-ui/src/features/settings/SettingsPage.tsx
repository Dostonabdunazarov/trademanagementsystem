import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, Landmark, Users, Settings2, Building2 } from 'lucide-react'
import { CurrenciesTab } from './CurrenciesTab'
import { AccountsTab } from './AccountsTab'
import { UsersTab } from './UsersTab'
import { BranchesTab } from './BranchesTab'
import { cn } from '@/lib/utils'

type TabId = 'currencies' | 'accounts' | 'users' | 'branches'

export function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('currencies')

  const TABS = [
    { id: 'currencies' as TabId, label: t('settings.currencies'), icon: DollarSign },
    { id: 'accounts' as TabId, label: t('settings.accounts'), icon: Landmark },
    { id: 'branches' as TabId, label: 'Филиалы', icon: Building2 },
    { id: 'users' as TabId, label: t('settings.users'), icon: Users },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[hsl(var(--border))]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50">
          <Settings2 className="h-4 w-4 text-[hsl(var(--text-muted))]" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[hsl(var(--text-primary))]">{t('settings.title')}</h1>
          <p className="text-xs text-[hsl(var(--text-muted))]">Валюты, курсы обмена, кассы и пользователи</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 px-6 pt-4 border-b border-[hsl(var(--border))] pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-[hsl(var(--text-muted))] hover:text-slate-300 hover:border-white/20'
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'currencies' && <CurrenciesTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'branches' && <BranchesTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </div>
  )
}
