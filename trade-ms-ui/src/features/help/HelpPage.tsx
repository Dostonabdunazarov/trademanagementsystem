import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Search, BookOpen, ArrowUpFromLine, Banknote, Package, Users, BarChart3, Settings, Keyboard, Rocket, GraduationCap, LayoutDashboard, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  id: string
  icon: React.ElementType
  iconColor: string
  title: string
  articles: Article[]
}

interface Article {
  title: string
  content: React.ReactNode
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[11px] font-mono text-[hsl(var(--text-primary))]">
      {children}
    </kbd>
  )
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'yellow' | 'green' }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variant === 'yellow' && 'bg-amber-500/15 text-amber-400',
      variant === 'green' && 'bg-emerald-500/15 text-emerald-400',
      variant === 'default' && 'bg-brand-500/15 text-brand-400',
    )}>
      {children}
    </span>
  )
}

function getSections(t: (key: string, options?: any) => string): Section[] {
  return [
    {
      id: 'getting-started',
      icon: Rocket,
      iconColor: 'text-brand-400',
      title: t('help.gettingStarted'),
      articles: [
        {
          title: t('help.whatIsSystem'),
          content: (
            <div className="space-y-2 text-[hsl(var(--text-primary))] text-sm">
              <p><strong>Торговля</strong> — {t('help.systemDesc')}</p>
              <p>{t('help.autoCalculation')}</p>
            </div>
          ),
        },
        {
          title: t('help.setupOrder'),
          content: (
            <div className="space-y-2 text-[hsl(var(--text-primary))] text-sm">
              <p>{t('help.setupDesc')}</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>{t('help.branchesSetup')}</li>
                <li>{t('help.currenciesSetup')}</li>
                <li>{t('help.accountsSetup')}</li>
                <li>{t('help.usersSetup')}</li>
                <li>{t('help.productsSetup')}</li>
                <li>{t('help.counterpartiesSetup')}</li>
              </ol>
              <p className="text-[hsl(var(--text-muted))]">{t('help.afterSetup')}</p>
            </div>
          ),
        },
        {
          title: t('help.operationProcess'),
          content: (
            <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
              <li>{t('help.step1')}</li>
              <li>{t('help.step2')}</li>
              <li>{t('help.step3')}</li>
              <li>{t('help.step4')}</li>
            </ol>
          ),
        },
      ],
    },
    {
      id: 'concepts',
      icon: GraduationCap,
      iconColor: 'text-emerald-400',
      title: t('help.concepts'),
      articles: [
        {
          title: t('help.branch'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.branchDesc')}
            </p>
          ),
        },
        {
          title: t('help.cashAccount'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.cashAccountDesc')}
            </p>
          ),
        },
        {
          title: t('help.counterparty'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.counterpartyDesc')}
            </p>
          ),
        },
        {
          title: t('help.counterpartyBalance'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.balancePositive')}</p>
              <p>{t('help.balanceNegative')}</p>
              <p>{t('help.balanceZero')}</p>
              <p className="text-[hsl(var(--text-muted))]">{t('help.balanceAuto')}</p>
            </div>
          ),
        },
        {
          title: t('help.product'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.productDesc')}
            </p>
          ),
        },
        {
          title: t('help.baseCurrency'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.baseCurrencyDesc')}
            </p>
          ),
        },
        {
          title: t('help.document'),
          content: (
            <div className="space-y-2 text-sm">
              <p className="text-[hsl(var(--text-primary))]">{t('help.documentDesc')}</p>
              <div className="flex items-center gap-3">
                <Badge variant="yellow">{t('status.Draft')}</Badge>
                <span className="text-[hsl(var(--text-primary))]">{t('help.draftStatus')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="green">{t('status.Confirmed')}</Badge>
                <span className="text-[hsl(var(--text-primary))]">{t('help.confirmedStatus')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default">{t('status.Cancelled')}</Badge>
                <span className="text-[hsl(var(--text-primary))]">{t('help.cancelledStatus')}</span>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-brand-400',
      title: t('help.dashboardTitle'),
      articles: [
        {
          title: t('help.whatShowsDashboard'),
          content: (
            <div className="space-y-2 text-[hsl(var(--text-primary))] text-sm">
              <p>{t('help.dashboardDesc')}</p>
              <p>{t('help.filterByBranch')}</p>
            </div>
          ),
        },
        {
          title: t('help.cardIndicators'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>• <strong>{t('help.revenue')}</strong></p>
              <p>• <strong>{t('help.profit')}</strong></p>
              <p>• <strong>{t('help.debtors')}</strong></p>
              <p>• <strong>{t('help.suppliers')}</strong></p>
              <p className="text-[hsl(var(--text-muted))]">{t('help.changeIndicator')}</p>
            </div>
          ),
        },
        {
          title: t('help.charts'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>• {t('help.revenueChart')}</p>
              <p>• {t('help.debtChart')}</p>
              <p>• {t('help.topProducts')}</p>
              <p>• {t('help.recentOps')}</p>
              <p>• {t('help.lowStockAlert')}</p>
            </div>
          ),
        },
        {
          title: t('help.quickActionsPanel'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.quickActionsDesc')}
            </p>
          ),
        },
      ],
    },
    {
      id: 'navigation',
      icon: Compass,
      iconColor: 'text-cyan-400',
      title: t('help.navigation'),
      articles: [
        {
          title: t('help.leftMenu'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.leftMenuDesc')}</p>
              <p>• {t('help.operationsSection')}</p>
              <p>• {t('help.directoriesSection')}</p>
              <p>• {t('help.analyticsSection')}</p>
              <p>• {t('help.systemSection')}</p>
              <p className="text-[hsl(var(--text-muted))]">{t('help.collapseMenuHint')}</p>
            </div>
          ),
        },
        {
          title: t('help.header'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>• {t('help.headerLeft')}</p>
              <p>• {t('help.headerRight')}</p>
              <p>• {t('help.logout')}</p>
            </div>
          ),
        },
        {
          title: t('help.documentLists'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.listDesc')}</p>
              <p>• {t('help.createButton')}</p>
              <p>• {t('help.searchFilter')}</p>
              <p>• {t('help.columns')}</p>
              <p>• {t('help.clickRow')}</p>
            </div>
          ),
        },
        {
          title: t('help.whereFind'),
          content: (
            <div className="space-y-1.5 text-sm text-[hsl(var(--text-primary))]">
              <p>• {t('help.findBranches')}</p>
              <p>• {t('help.findAccounts')}</p>
              <p>• {t('help.findCurrencies')}</p>
              <p>• {t('help.findUsers')}</p>
              <p>• {t('help.findActiveBranch')}</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'documents',
      icon: ArrowUpFromLine,
      iconColor: 'text-rose-400',
      title: t('help.documents'),
      articles: [
        {
          title: t('help.saleSale'),
          content: (
            <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
              <li>{t('help.saleStep1')}</li>
              <li>{t('help.saleStep2')}</li>
              <li>{t('help.saleStep3')}</li>
              <li>{t('help.saleStep4')}</li>
              <li>{t('help.saleStep5')}</li>
              <li>{t('help.saleStep6')}</li>
            </ol>
          ),
        },
        {
          title: t('help.purchase'),
          content: (
            <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
              <li>{t('help.purchaseStep1')}</li>
              <li>{t('help.purchaseStep2')}</li>
              <li>{t('help.purchaseStep3')}</li>
              <li>{t('help.purchaseStep4')}</li>
            </ol>
          ),
        },
        {
          title: t('help.returnCustomer'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.returnCustomerDesc')}
            </p>
          ),
        },
        {
          title: t('help.returnSupplier'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.returnSupplierDesc')}
            </p>
          ),
        },
        {
          title: t('help.documentStatuses'),
          content: (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant="yellow">{t('status.Draft')}</Badge>
                <span className="text-[hsl(var(--text-primary))]">{t('help.draftDesc')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="green">{t('status.Confirmed')}</Badge>
                <span className="text-[hsl(var(--text-primary))]">{t('help.confirmedDesc')}</span>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      id: 'payments',
      icon: Banknote,
      iconColor: 'text-emerald-400',
      title: t('help.payments'),
      articles: [
        {
          title: t('help.payOut'),
          content: (
            <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
              <li>{t('help.payOutStep1')}</li>
              <li>{t('help.payOutStep2')}</li>
              <li>{t('help.payOutStep3')}</li>
              <li>{t('help.payOutStep4')}</li>
            </ol>
          ),
        },
        {
          title: t('help.payIn'),
          content: (
            <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
              <li>{t('help.payInStep1')}</li>
              <li>{t('help.payInStep2')}</li>
              <li>{t('help.payInStep3')}</li>
              <li>{t('help.payInStep4')}</li>
            </ol>
          ),
        },
      ],
    },
    {
      id: 'products',
      icon: Package,
      iconColor: 'text-brand-400',
      title: t('help.products'),
      articles: [
        {
          title: t('help.addProduct'),
          content: (
            <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
              <li>{t('help.addProductStep1')}</li>
              <li>{t('help.addProductStep2')}</li>
              <li>{t('help.addProductStep3')}</li>
              <li>{t('help.addProductStep4')}</li>
              <li>{t('help.addProductStep5')}</li>
            </ol>
          ),
        },
        {
          title: t('help.productGroups'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.groupsDesc')}
            </p>
          ),
        },
        {
          title: t('help.whatShowsProducts'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.productListDesc')}</p>
              <p><strong>{t('help.productColumns')}</strong></p>
              <p className="text-[hsl(var(--text-muted))]">{t('help.productAdmin')}</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'counterparties',
      icon: Users,
      iconColor: 'text-amber-400',
      title: t('help.counterparties'),
      articles: [
        {
          title: t('help.clientsSuppliers'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.clientsSuppliersDesc')}
            </p>
          ),
        },
        {
          title: t('help.counterpartyBalanceTitle'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.balanceDesc')}</p>
            </div>
          ),
        },
        {
          title: t('help.whatShowsCounterparties'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.counterpartyListDesc')}</p>
              <p><strong>{t('help.counterpartyColumns')}</strong></p>
              <p className="text-[hsl(var(--text-muted))]">{t('help.counterpartyFields')}</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'reports',
      icon: BarChart3,
      iconColor: 'text-brand-400',
      title: t('help.reports'),
      articles: [
        {
          title: t('help.salesReport'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.salesReportDesc')}</p>
              <p>{t('help.salesReportCards')}</p>
            </div>
          ),
        },
        {
          title: t('help.stockReport'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.stockReportDesc')}</p>
              <p>{t('help.stockReportCards')}</p>
            </div>
          ),
        },
        {
          title: t('help.balancesReport'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.balancesReportDesc')}</p>
              <p>{t('help.balancesReportColumns')}</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'settings',
      icon: Settings,
      iconColor: 'text-[hsl(var(--text-muted))]',
      title: t('help.settingsTitle'),
      articles: [
        {
          title: t('help.settingsTitle'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.settingsTabs')}
            </p>
          ),
        },
        {
          title: t('help.currenciesAndRates'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.currenciesDesc')}
            </p>
          ),
        },
        {
          title: t('help.accountsTitle'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.accountsDesc')}
            </p>
          ),
        },
        {
          title: t('help.branchesTitle'),
          content: (
            <p className="text-[hsl(var(--text-primary))] text-sm">
              {t('help.branchesDesc')}
            </p>
          ),
        },
        {
          title: t('help.usersAndRoles'),
          content: (
            <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
              <p>{t('help.usersDesc')}</p>
              <p>{t('help.rolesDesc')}</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'hotkeys',
      icon: Keyboard,
      iconColor: 'text-cyan-400',
      title: t('help.hotkeys'),
      articles: [
        {
          title: t('help.quickActions'),
          content: (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { key: 'F1', desc: t('help.f1') },
                { key: 'F2', desc: t('help.f2') },
                { key: 'F3', desc: t('help.f3') },
                { key: 'F4', desc: t('help.f4') },
                { key: 'F5', desc: t('help.f5') },
                { key: 'F6', desc: t('help.f6') },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-3">
                  <Kbd>{key}</Kbd>
                  <span className="text-[hsl(var(--text-primary))] text-sm">{desc}</span>
                </div>
              ))}
            </div>
          ),
        },
      ],
    },
  ]
}

function ArticleAccordion({ article }: { article: Article }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[hsl(var(--border))] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface-2))] transition-colors"
      >
        <span>{article.title}</span>
        {open
          ? <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-muted))]" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-muted))]" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1">
          {article.content}
        </div>
      )}
    </div>
  )
}

export function HelpPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const SECTIONS = getSections(t)
  const query = search.toLowerCase().trim()

  const filtered = SECTIONS.map((section) => ({
    ...section,
    articles: section.articles.filter(
      (a) =>
        !query ||
        section.title.toLowerCase().includes(query) ||
        a.title.toLowerCase().includes(query),
    ),
  })).filter((s) => s.articles.length > 0)

  return (
    <div className="flex h-full min-h-0">
      {/* Left nav */}
      <aside className="hidden w-56 shrink-0 border-r border-[hsl(var(--border))] overflow-y-auto lg:block">
        <div className="py-6 px-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--text-muted))]">{t('help.sections')}</p>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id)
                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    activeSection === s.id
                      ? 'bg-brand-500/10 text-brand-300'
                      : 'text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text-primary))]',
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', s.iconColor)} strokeWidth={1.8} />
                  {s.title}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 ring-1 ring-brand-500/30">
              <BookOpen className="h-5 w-5 text-brand-400" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">{t('help.title')}</h1>
              <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t('help.guide')}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('help.searchPlaceholder')}
              className="w-full rounded-xl border border-border bg-[hsl(var(--surface-2))] py-2.5 pl-10 pr-4 text-sm text-[hsl(var(--text-primary))] placeholder-slate-600 outline-none transition focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-6 py-12 text-center">
                <p className="text-[hsl(var(--text-muted))]">{t('help.notFound', { search })}</p>
              </div>
            )}
            {filtered.map((section) => {
              const Icon = section.icon
              return (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-card"
                >
                  <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-5 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))]">
                      <Icon className={cn('h-4 w-4', section.iconColor)} strokeWidth={1.8} />
                    </div>
                    <h2 className="font-medium text-[hsl(var(--text-primary))]">{section.title}</h2>
                  </div>
                  <div>
                    {section.articles.map((article) => (
                      <ArticleAccordion key={article.title} article={article} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
