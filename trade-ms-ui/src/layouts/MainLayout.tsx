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
  Sun,
  Moon,
  Building2,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { AppLogoIcon } from '@/components/ui/AppLogo'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { BranchSelector } from '@/components/dashboard/BranchSelector'
import { CurrencyRateTicker } from '@/components/dashboard/CurrencyRateTicker'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUiStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null)
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  type NavItem = { to: string; icon: LucideIcon; label: string; end?: boolean }
  const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
    {
      label: t('nav.overview'),
      items: [
        { to: '/', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
      ],
    },
    {
      label: t('nav.createDocument'),
      items: [
        { to: '/expense', icon: ArrowUpFromLine, label: t('nav.expense') },
        { to: '/income', icon: ArrowDownToLine, label: t('nav.income') },
        { to: '/return-customer', icon: RotateCcw, label: t('nav.returnCustomer') },
        { to: '/return-supplier', icon: RefreshCw, label: t('nav.returnSupplier') },
        { to: '/pay-out', icon: Banknote, label: t('nav.payOut') },
        { to: '/pay-in', icon: Wallet, label: t('nav.payIn') },
      ],
    },
    {
      label: t('nav.journals'),
      items: [
        { to: '/expenses', icon: ArrowUpFromLine, label: t('nav.expenseList') },
        { to: '/incomes', icon: ArrowDownToLine, label: t('nav.incomeList') },
        { to: '/return-customers', icon: RotateCcw, label: t('nav.returnCustomerList') },
        { to: '/return-suppliers', icon: RefreshCw, label: t('nav.returnSupplierList') },
        { to: '/pay-outs', icon: Banknote, label: t('nav.payOutList') },
        { to: '/pay-ins', icon: Wallet, label: t('nav.payInList') },
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
            <NavLink
              to="/"
              end
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
              aria-label={t('nav.dashboard')}
            >
              <AppLogoIcon size={28} />
              <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-brand-600 to-brand-600 dark:from-brand-400 dark:to-brand-400 bg-clip-text text-transparent">Торговля</span>
            </NavLink>
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
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.label} className={cn('mb-1', i > 0 && 'mt-4')}>
              {sidebarOpen ? (
                <div className="mb-1.5 flex items-center gap-2 px-4">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-brand-500" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] bg-gradient-to-r from-[hsl(var(--text-primary))] to-[hsl(var(--text-muted))] bg-clip-text text-transparent">
                    {section.label}
                  </p>
                  <span className="h-px flex-1 bg-gradient-to-r from-[hsl(var(--border))] to-transparent" />
                </div>
              ) : (
                i > 0 && <div className="mx-3 mb-2 h-px bg-[hsl(var(--border))]" />
              )}
              {section.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onMouseEnter={
                    !sidebarOpen
                      ? (e) => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setTooltip({ label, top: r.top + r.height / 2 })
                        }
                      : undefined
                  }
                  onMouseLeave={!sidebarOpen ? () => setTooltip(null) : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-all duration-150',
                      isActive
                        ? 'bg-gradient-to-r from-brand-500/15 to-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-sm shadow-brand-500/10'
                        : 'nav-link-idle text-[hsl(var(--text-muted))] hover:font-semibold',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-gradient-to-b from-brand-500 to-brand-500" />
                      )}
                      <Icon className={cn('nav-link-icon h-4 w-4 shrink-0 transition-colors', isActive ? 'text-brand-500' : 'text-[hsl(var(--text-muted))]')} strokeWidth={1.8} />
                      {sidebarOpen && <span className="truncate transition-all duration-150 group-hover:text-[0.9375rem]">{label}</span>}
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
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-xs font-bold text-white shadow-md shadow-brand-500/30 group/avatar"
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
                <p className="truncate text-[10px] text-[hsl(var(--text-muted))]">{user?.email}</p>
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

      {/* Collapsed-sidebar tooltip (fixed, escapes scroll clipping) */}
      {!sidebarOpen && tooltip && (
        <div
          className="pointer-events-none fixed left-[3.5rem] z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--text-primary))] shadow-xl animate-in fade-in duration-150"
          style={{ top: tooltip.top }}
        >
          {tooltip.label}
        </div>
      )}

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
            <LanguageSelect />

            <CurrencyRateTicker />

            {user?.companyName && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-400" />
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
