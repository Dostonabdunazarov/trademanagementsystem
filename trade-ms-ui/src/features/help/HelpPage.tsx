import { useState } from 'react'
import { ChevronDown, ChevronRight, Search, BookOpen, ArrowUpFromLine, Banknote, Package, Users, BarChart3, Settings, Keyboard } from 'lucide-react'
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

const SECTIONS: Section[] = [
  {
    id: 'documents',
    icon: ArrowUpFromLine,
    iconColor: 'text-rose-400',
    title: 'Документы',
    articles: [
      {
        title: 'Расход товара (F1)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F1</Kbd> или «Расход» в меню слева.</li>
            <li>Выберите контрагента (покупателя) из выпадающего списка.</li>
            <li>Нажмите «+ Добавить товар», найдите товар по названию или штрих-коду.</li>
            <li>Укажите количество и цену продажи.</li>
            <li>Нажмите «Сохранить черновик» — документ будет создан со статусом <Badge>Черновик</Badge>.</li>
            <li>Когда всё проверено — нажмите «Подтвердить». Остатки и баланс контрагента обновятся автоматически.</li>
          </ol>
        ),
      },
      {
        title: 'Приход товара (F2)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F2</Kbd> или «Приход» в меню.</li>
            <li>Выберите поставщика.</li>
            <li>Добавьте товары с закупочными ценами и количеством.</li>
            <li>Сохраните и подтвердите — остатки на складе увеличатся.</li>
          </ol>
        ),
      },
      {
        title: 'Возврат от клиента (F3)',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Используется когда покупатель возвращает товар. Выберите клиента, добавьте возвращаемые позиции. После подтверждения — остаток товара восстановится, баланс клиента скорректируется.
          </p>
        ),
      },
      {
        title: 'Возврат поставщику (F4)',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Используется для возврата товара поставщику. После подтверждения — остаток уменьшится, задолженность перед поставщиком скорректируется.
          </p>
        ),
      },
      {
        title: 'Статусы документов',
        content: (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <Badge variant="yellow">Черновик</Badge>
              <span className="text-[hsl(var(--text-primary))]">Документ создан, но не проведён. Можно редактировать и удалять.</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="green">Подтверждён</Badge>
              <span className="text-[hsl(var(--text-primary))]">Документ проведён. Остатки и балансы обновлены. Редактирование недоступно.</span>
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
    title: 'Оплаты',
    articles: [
      {
        title: 'Оплата деньги — выдача (F5)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F5</Kbd> или «Оплата деньги» в меню.</li>
            <li>Выберите контрагента, которому выплачиваем.</li>
            <li>Укажите сумму, валюту и кассу/счёт списания.</li>
            <li>Подтвердите — баланс контрагента и остаток кассы изменятся.</li>
          </ol>
        ),
      },
      {
        title: 'Получить деньги — приём (F6)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F6</Kbd> или «Получить деньги» в меню.</li>
            <li>Выберите контрагента, от которого получаем оплату.</li>
            <li>Укажите сумму, валюту и кассу/счёт зачисления.</li>
            <li>Подтвердите — задолженность клиента уменьшится.</li>
          </ol>
        ),
      },
    ],
  },
  {
    id: 'products',
    icon: Package,
    iconColor: 'text-indigo-400',
    title: 'Товары',
    articles: [
      {
        title: 'Добавление товара',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Перейдите в «Товары» в меню слева.</li>
            <li>Выберите группу товаров в левой панели (или создайте новую).</li>
            <li>Нажмите «+ Добавить товар».</li>
            <li>Заполните название, SKU, единицу измерения, закупочную и продажную цену.</li>
            <li>Нажмите «Сохранить».</li>
          </ol>
        ),
      },
      {
        title: 'Группы товаров',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Товары организованы в группы (категории). Группу можно создать кнопкой «+ Группа» в левой панели. Это помогает быстро фильтровать товары при создании документов.
          </p>
        ),
      },
    ],
  },
  {
    id: 'counterparties',
    icon: Users,
    iconColor: 'text-amber-400',
    title: 'Контрагенты',
    articles: [
      {
        title: 'Клиенты и поставщики',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Контрагенты делятся на <strong className="text-[hsl(var(--text-primary))]">Клиентов</strong> (покупатели) и <strong className="text-[hsl(var(--text-primary))]">Поставщиков</strong>. При создании укажите тип, имя и контактные данные. Баланс рассчитывается автоматически на основе проведённых документов и оплат.
          </p>
        ),
      },
      {
        title: 'Баланс контрагента',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Положительный баланс — контрагент <strong className="text-emerald-400">должен нам</strong> (дебитор).</p>
            <p>Отрицательный баланс — <strong className="text-red-400">мы должны</strong> контрагенту (кредитор).</p>
            <p>Нулевой — взаиморасчёты закрыты.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'reports',
    icon: BarChart3,
    iconColor: 'text-violet-400',
    title: 'Отчёты',
    articles: [
      {
        title: 'Отчёт по продажам',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Показывает выручку, себестоимость и прибыль за выбранный период. Можно фильтровать по датам. Таблица детализирует рентабельность по каждому товару.
          </p>
        ),
      },
      {
        title: 'Остатки склада',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Показывает текущие остатки всех товаров. Фильтр «низкий остаток» выделяет позиции, которые заканчиваются. Используйте для планирования закупок.
          </p>
        ),
      },
      {
        title: 'Балансы контрагентов',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Сводная таблица задолженностей: кто должен нам (дебиторы) и кому должны мы (кредиторы). Можно фильтровать по типу (клиенты / поставщики).
          </p>
        ),
      },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    iconColor: 'text-[hsl(var(--text-muted))]',
    title: 'Настройки',
    articles: [
      {
        title: 'Валюты и курсы',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            В разделе «Настройки → Валюты» добавляются рабочие валюты и курсы обмена. Базовая валюта отмечена звёздочкой — в ней ведётся основной учёт.
          </p>
        ),
      },
      {
        title: 'Кассы и счета',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Добавьте кассы (наличные) и банковские счета в «Настройки → Кассы». Они используются при проведении оплат и отражают реальный остаток денег.
          </p>
        ),
      },
      {
        title: 'Пользователи',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Администратор может добавлять сотрудников в «Настройки → Пользователи». Роли: <strong className="text-[hsl(var(--text-primary))]">Admin</strong> — полный доступ, <strong className="text-[hsl(var(--text-primary))]">Manager</strong> — работа с документами и справочниками, <strong className="text-[hsl(var(--text-primary))]">Cashier</strong> — только оплаты и документы.
          </p>
        ),
      },
    ],
  },
  {
    id: 'hotkeys',
    icon: Keyboard,
    iconColor: 'text-cyan-400',
    title: 'Горячие клавиши',
    articles: [
      {
        title: 'Быстрые действия',
        content: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: 'F1', desc: 'Новый расход' },
              { key: 'F2', desc: 'Новый приход' },
              { key: 'F3', desc: 'Возврат от клиента' },
              { key: 'F4', desc: 'Возврат поставщику' },
              { key: 'F5', desc: 'Выдать деньги' },
              { key: 'F6', desc: 'Принять деньги' },
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
      variant === 'default' && 'bg-indigo-500/15 text-indigo-400',
    )}>
      {children}
    </span>
  )
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
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

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
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--text-muted))]">Разделы</p>
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
                      ? 'bg-indigo-500/10 text-indigo-300'
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
              <BookOpen className="h-5 w-5 text-indigo-400" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[hsl(var(--text-primary))]">Справка</h1>
              <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">Руководство по работе с системой Торговля</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-muted))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по справке..."
              className="w-full rounded-xl border border-border bg-[hsl(var(--surface-2))] py-2.5 pl-10 pr-4 text-sm text-[hsl(var(--text-primary))] placeholder-slate-600 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-6 py-12 text-center">
                <p className="text-[hsl(var(--text-muted))]">Ничего не найдено по запросу «{search}»</p>
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
