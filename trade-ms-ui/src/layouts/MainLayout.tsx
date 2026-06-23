import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  ArrowUpFromLine,
  ArrowDownToLine,
  RotateCcw,
  RefreshCw,
  Banknote,
  Wallet,
  Package,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  List,
  Languages,
  Sun,
  Moon,
  Building2,
  ScrollText,
} from 'lucide-react'
import { AppLogoIcon } from '@/components/ui/AppLogo'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { BranchSelector } from '@/components/dashboard/BranchSelector'
import { CurrencyRateTicker } from '@/components/dashboard/CurrencyRateTicker'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar, language, setLanguage, theme, toggleTheme } = useUiStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const NAV_SECTIONS = [
    {
      label: t('nav.operations'),
      items: [
        { to: '/', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
        { to: '/expense', icon: ArrowUpFromLine, label: t('nav.expense') },
        { to: '/expenses', icon: List, label: t('nav.expenseList') },
        { to: '/income', icon: ArrowDownToLine, label: t('nav.income') },
        { to: '/incomes', icon: List, label: t('nav.incomeList') },
        { to: '/return-customer', icon: RotateCcw, label: t('nav.returnCustomer') },
        { to: '/return-customers', icon: List, label: t('nav.returnCustomerList') },
        { to: '/return-supplier', icon: RefreshCw, label: t('nav.returnSupplier') },
        { to: '/return-suppliers', icon: List, label: t('nav.returnSupplierList') },
        { to: '/pay-out', icon: Banknote, label: t('nav.payOut') },
        { to: '/pay-outs', icon: List, label: t('nav.payOutList') },
        { to: '/pay-in', icon: Wallet, label: t('nav.payIn') },
        { to: '/pay-ins', icon: List, label: t('nav.payInList') },
      ],
    },
    {
      label: t('nav.directories'),
      items: [
        { to: '/products', icon: Package, label: t('nav.products') },
        { to: '/counterparties', icon: Users, label: t('nav.counterparties') },
      ],
    },
    {
      label: t('nav.analytics'),
      items: [
        { to: '/reports', icon: BarChart3, label: t('nav.reports') },
      ],
    },
    {
      label: t('nav.system'),
      items: [
        { to: '/settings', icon: Settings, label: t('nav.settings') },
        { to: '/help', icon: HelpCircle, label: t('nav.help') },
        ...(user?.role === 'Admin'
          ? [{ to: '/audit-logs', icon: ScrollText, label: t('nav.auditLogs') }]
          : []),
      ],
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--text-primary))]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 md:relative md:z-auto bg-[hsl(var(--background))]',
          sidebarOpen ? 'w-60' : 'w-16',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-14 shrink-0 items-center border-b border-[hsl(var(--border))]', sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2')}>
          {sidebarOpen && (
            <>
              <AppLogoIcon size={28} />
              <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">Торговля</span>
            </>
          )}
          <button
            onClick={toggleSidebar}
            className={cn('hidden rounded-md p-1 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors md:flex', sidebarOpen ? 'ml-auto' : '')}
            aria-label={sidebarOpen ? t('nav.collapseMenu') : t('nav.expandMenu')}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-1">
              {sidebarOpen && (
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--text-muted))]">
                  {section.label}
                </p>
              )}
              {section.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all duration-150',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm shadow-indigo-500/10'
                        : 'nav-link-idle text-[hsl(var(--text-muted))] hover:font-semibold',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-gradient-to-b from-indigo-500 to-violet-500" />
                      )}
                      <Icon className={cn('nav-link-icon h-4 w-4 shrink-0 transition-colors', isActive ? 'text-indigo-500' : 'text-[hsl(var(--text-muted))]')} strokeWidth={1.8} />
                      {sidebarOpen && <span className="truncate transition-all duration-150 group-hover:text-[0.9375rem]">{label}</span>}
                      {!sidebarOpen && (
                        <span className="absolute left-full ml-2 hidden whitespace-nowrap rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1 text-xs text-[hsl(var(--text-primary))] shadow-xl group-hover:block">
                          {label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-[hsl(var(--border))] p-3">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-500/30 group/avatar"
              title={user?.fullName ?? ''}
            >
              {user?.fullName?.charAt(0) ?? 'U'}
              {!sidebarOpen && user?.fullName && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[hsl(var(--surface-2))] px-2 py-1 text-[11px] font-medium text-[hsl(var(--text-primary))] ring-1 ring-[hsl(var(--border))] opacity-0 group-hover/avatar:opacity-100 transition-opacity z-50">
                  {user.fullName}
                </span>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-[hsl(var(--text-primary))]">{user?.fullName}</p>
                <p className="truncate text-[10px] text-[hsl(var(--text-muted))]">{user?.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-md p-1.5 text-[hsl(var(--text-muted))] hover:bg-red-500/10 hover:text-red-500 transition-colors"
              aria-label={t('auth.logout')}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-4 px-4 overflow-visible relative z-20 bg-[hsl(var(--background))]">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md p-1.5 text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))] transition-colors md:hidden"
            aria-label={t('nav.openMenu')}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <BranchSelector />

          <div className="ml-auto flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors"
              aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Language switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-1">
              <Languages className="h-3.5 w-3.5 text-[hsl(var(--text-muted))] mx-1" />
              <button
                onClick={() => setLanguage('ru')}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  language === 'ru'
                    ? 'bg-indigo-500/20 text-indigo-500'
                    : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
                )}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage('uz')}
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  language === 'uz'
                    ? 'bg-indigo-500/20 text-indigo-500'
                    : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
                )}
              >
                UZ
              </button>
            </div>

            <CurrencyRateTicker />

            {user?.companyName && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="text-xs font-medium text-[hsl(var(--text-primary))] max-w-[160px] truncate">{user.companyName}</span>
              </div>
            )}

          </div>
        </header>

        {/* Page content — white background */}
        <main className="flex-1 overflow-y-auto bg-[hsl(var(--surface))]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
