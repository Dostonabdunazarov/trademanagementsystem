import { useState } from 'react'
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

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    icon: Rocket,
    iconColor: 'text-indigo-400',
    title: 'Начало работы',
    articles: [
      {
        title: 'Что это за система',
        content: (
          <div className="space-y-2 text-[hsl(var(--text-primary))] text-sm">
            <p><strong>Торговля</strong> — система учёта торговых операций: продажи и закупки товаров, движение денег, взаиморасчёты с клиентами и поставщиками.</p>
            <p>Система сама считает остатки на складе, задолженности контрагентов и остатки в кассах — вам достаточно правильно оформлять документы.</p>
          </div>
        ),
      },
      {
        title: 'Порядок первоначальной настройки',
        content: (
          <div className="space-y-2 text-[hsl(var(--text-primary))] text-sm">
            <p>Прежде чем оформлять документы, заполните справочники (обычно это делает администратор в разделе «Настройки» и в справочниках слева):</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              <li><strong>Филиалы</strong> — «Настройки → Филиалы». Хотя бы один филиал (точка/магазин/склад).</li>
              <li><strong>Валюты и курсы</strong> — «Настройки → Валюты и курсы». Отметьте базовую валюту, добавьте курсы для остальных.</li>
              <li><strong>Кассы и счета</strong> — «Настройки → Кассы». Куда приходят и откуда уходят деньги.</li>
              <li><strong>Пользователи</strong> — «Настройки → Пользователи». Сотрудники и их роли.</li>
              <li><strong>Товары и группы</strong> — раздел «Товары».</li>
              <li><strong>Контрагенты</strong> — раздел «Контрагенты» (клиенты и поставщики).</li>
            </ol>
            <p className="text-[hsl(var(--text-muted))]">После этого можно оформлять расходы, приходы, оплаты и возвраты.</p>
          </div>
        ),
      },
      {
        title: 'Как оформляется любая операция',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Открываете нужный тип документа (меню слева или клавиши <Kbd>F1</Kbd>–<Kbd>F6</Kbd>).</li>
            <li>Заполняете шапку (контрагент, дата, валюта) и добавляете товары или сумму оплаты.</li>
            <li>Сохраняете как <Badge variant="yellow">Черновик</Badge> — его ещё можно править.</li>
            <li>Проверяете и нажимаете <strong>«Подтвердить»</strong>. Только после этого меняются склад, балансы и кассы.</li>
          </ol>
        ),
      },
    ],
  },
  {
    id: 'concepts',
    icon: GraduationCap,
    iconColor: 'text-emerald-400',
    title: 'Основные понятия',
    articles: [
      {
        title: 'Филиал',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Обособленная точка компании — магазин, склад или подразделение. У каждого филиала свои остатки товаров и свои кассы. Активный филиал выбирается в <strong>шапке сверху слева</strong>. Администратор может переключаться между филиалами (или выбрать «Все филиалы»), остальные сотрудники видят только свой филиал.
          </p>
        ),
      },
      {
        title: 'Касса / Счёт',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Место хранения денег: <strong>Касса</strong> — наличные, <strong>Банк</strong> — банковский счёт. Остаток кассы меняется при проведении оплат (получили деньги — плюс, выдали — минус). Настраивается в «Настройки → Кассы».
          </p>
        ),
      },
      {
        title: 'Контрагент (клиент / поставщик)',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Тот, с кем вы торгуете. <strong>Клиент</strong> покупает у вас, <strong>Поставщик</strong> продаёт вам (тип <strong>Оба</strong> — и то, и другое). У контрагента есть баланс — текущая взаимная задолженность.
          </p>
        ),
      },
      {
        title: 'Баланс контрагента',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Показывает, кто кому должен на данный момент:</p>
            <p>• <strong className="text-emerald-400">Положительный</strong> — контрагент должен нам (<strong>дебитор</strong>).</p>
            <p>• <strong className="text-red-400">Отрицательный</strong> — мы должны контрагенту (<strong>кредитор</strong>).</p>
            <p>• <strong>Нулевой</strong> — взаиморасчёты закрыты.</p>
            <p className="text-[hsl(var(--text-muted))]">Баланс считается автоматически из проведённых документов и оплат.</p>
          </div>
        ),
      },
      {
        title: 'Товар, группа, остаток',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            <strong>Товар</strong> — позиция с ценой продажи и закупки. <strong>Группа</strong> — категория для удобной сортировки (может быть вложенной). <strong>Остаток</strong> — сколько товара сейчас на складе конкретного филиала; меняется при проведении приходов, расходов и возвратов.
          </p>
        ),
      },
      {
        title: 'Базовая валюта и курс',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            <strong>Базовая валюта</strong> — основная валюта учёта (в ней ведутся все итоги, балансы и остатки касс). Документы в других валютах пересчитываются в базовую по <strong>курсу</strong> на дату документа. Курс на момент проведения берётся из «Настройки → Валюты и курсы».
          </p>
        ),
      },
      {
        title: 'Документ и его статусы',
        content: (
          <div className="space-y-2 text-sm">
            <p className="text-[hsl(var(--text-primary))]">Документ — запись об одной операции (продажа, закупка, оплата, возврат). Проходит статусы:</p>
            <div className="flex items-center gap-3">
              <Badge variant="yellow">Черновик</Badge>
              <span className="text-[hsl(var(--text-primary))]">Создан, не проведён. Можно менять и удалять. На остатки не влияет.</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="green">Подтверждён</Badge>
              <span className="text-[hsl(var(--text-primary))]">Проведён. Остатки, балансы и кассы обновлены. Удалить нельзя — только отменить.</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default">Отменён</Badge>
              <span className="text-[hsl(var(--text-primary))]">Проведение отменено, все изменения откатаны обратно.</span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    iconColor: 'text-violet-400',
    title: 'Дашборд',
    articles: [
      {
        title: 'Что показывает главный экран',
        content: (
          <div className="space-y-2 text-[hsl(var(--text-primary))] text-sm">
            <p>Дашборд (главная страница) — сводка по бизнесу за выбранный период. Наверху есть переключатель <strong>периода</strong>: текущий месяц, прошлый месяц, квартал, год или произвольный диапазон.</p>
            <p>Все данные учитывают выбранный в шапке <strong>филиал</strong> («Все филиалы» — по всей компании).</p>
          </div>
        ),
      },
      {
        title: 'Карточки-показатели (верхний ряд)',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>• <strong>Выручка</strong> — сумма продаж за период.</p>
            <p>• <strong>Прибыль</strong> — выручка минус себестоимость.</p>
            <p>• <strong>Дебиторский долг</strong> — сколько всего должны нам клиенты.</p>
            <p>• <strong>Долг поставщикам</strong> — сколько всего должны мы.</p>
            <p className="text-[hsl(var(--text-muted))]">У выручки и прибыли показана стрелка изменения к предыдущему сопоставимому периоду.</p>
          </div>
        ),
      },
      {
        title: 'Графики и виджеты',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>• <strong>Выручка и прибыль</strong> — график по месяцам (за 12 месяцев).</p>
            <p>• <strong>Дебиторская задолженность</strong> — список контрагентов-должников.</p>
            <p>• <strong>Топ товары по продажам</strong> — самые продаваемые позиции.</p>
            <p>• <strong>Последние операции</strong> — лента недавних действий.</p>
            <p>• <strong>Низкий остаток товаров</strong> — предупреждение о заканчивающихся позициях.</p>
          </div>
        ),
      },
      {
        title: 'Панель быстрых действий',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Внизу экрана закреплена панель с кнопками <Kbd>F1</Kbd>–<Kbd>F6</Kbd> для мгновенного создания документов. Те же клавиши работают с клавиатуры из любого места программы.
          </p>
        ),
      },
    ],
  },
  {
    id: 'navigation',
    icon: Compass,
    iconColor: 'text-cyan-400',
    title: 'Где что находится',
    articles: [
      {
        title: 'Меню слева',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Боковое меню разбито на разделы:</p>
            <p>• <strong>Операции</strong> — Дашборд и все документы (расход, приход, возвраты, оплаты) с их списками.</p>
            <p>• <strong>Справочники</strong> — Товары и Контрагенты.</p>
            <p>• <strong>Аналитика</strong> — Отчёты.</p>
            <p>• <strong>Система</strong> — Настройки, Справка и (для администратора) Журнал действий.</p>
            <p className="text-[hsl(var(--text-muted))]">Меню можно свернуть стрелкой вверху, чтобы освободить место.</p>
          </div>
        ),
      },
      {
        title: 'Шапка сверху',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>• <strong>Слева</strong> — выбор активного филиала.</p>
            <p>• <strong>Справа</strong> — переключатель темы (светлая/тёмная), язык (RU/UZ), текущие курсы валют и название компании.</p>
            <p>• <strong>Выход</strong> из системы — внизу бокового меню, рядом с вашим именем.</p>
          </div>
        ),
      },
      {
        title: 'Списки документов',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>У каждого типа документа есть свой список (например, «Список продаж»). В нём:</p>
            <p>• Кнопка <strong>«Создать»</strong> — новый документ.</p>
            <p>• <strong>Поиск</strong> по номеру или контрагенту и <strong>фильтры</strong> (дата от/до, статус).</p>
            <p>• Столбцы: <strong>№, Дата, Контрагент, Сумма, Валюта, Статус</strong>.</p>
            <p>• Клик по строке открывает документ. У черновиков при наведении появляются кнопки <strong>подтвердить</strong> (зелёная) и <strong>удалить</strong> (красная).</p>
          </div>
        ),
      },
      {
        title: 'Где искать филиалы, кассы, валюты',
        content: (
          <div className="space-y-1.5 text-sm text-[hsl(var(--text-primary))]">
            <p>• <strong>Филиалы</strong> → Настройки → вкладка «Филиалы».</p>
            <p>• <strong>Кассы и счета</strong> → Настройки → вкладка «Кассы».</p>
            <p>• <strong>Валюты и курсы</strong> → Настройки → вкладка «Валюты и курсы».</p>
            <p>• <strong>Пользователи</strong> → Настройки → вкладка «Пользователи».</p>
            <p>• <strong>Активный филиал</strong> → переключатель в шапке сверху.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'documents',
    icon: ArrowUpFromLine,
    iconColor: 'text-rose-400',
    title: 'Документы',
    articles: [
      {
        title: 'Продажа товара (F1)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F1</Kbd> или «Продажа» в меню слева.</li>
            <li>Выберите контрагента (покупателя) из выпадающего списка.</li>
            <li>Нажмите «+ Добавить товар», найдите товар по названию или штрих-коду.</li>
            <li>Укажите количество и цену продажи.</li>
            <li>Нажмите «Сохранить черновик» — документ будет создан со статусом <Badge>Черновик</Badge>.</li>
            <li>Когда всё проверено — нажмите «Подтвердить». Остатки и баланс контрагента обновятся автоматически.</li>
          </ol>
        ),
      },
      {
        title: 'Закупка товара (F2)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F2</Kbd> или «Закупка» в меню.</li>
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
        title: 'Выплата — выдача денег (F5)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F5</Kbd> или «Выплата» в меню.</li>
            <li>Выберите контрагента, которому выплачиваем.</li>
            <li>Укажите сумму, валюту и кассу/счёт списания.</li>
            <li>Подтвердите — баланс контрагента и остаток кассы изменятся.</li>
          </ol>
        ),
      },
      {
        title: 'Приём оплаты — получение денег (F6)',
        content: (
          <ol className="space-y-2 text-[hsl(var(--text-primary))] text-sm list-decimal list-inside">
            <li>Нажмите <Kbd>F6</Kbd> или «Приём оплаты» в меню.</li>
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
            Товары организованы в группы (категории). Группу можно создать кнопкой «+» рядом с заголовком «Группа» в левой панели; группа может быть вложенной. Это помогает быстро фильтровать товары при создании документов.
          </p>
        ),
      },
      {
        title: 'Что показано в списке товаров',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Слева — дерево групп («Все группы» показывает всё). Справа — таблица товаров со столбцами:</p>
            <p><strong>Наименование · Артикул (SKU) · Единица · Цена продажи · Цена покупки · Валюта · Статус</strong> (Активен/Неактивен).</p>
            <p className="text-[hsl(var(--text-muted))]">Создавать и редактировать товары может администратор.</p>
          </div>
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
      {
        title: 'Что показано в списке контрагентов',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Сверху — поиск и фильтр по типу («Все» / «Клиенты» / «Поставщики»), а также счётчики: <strong>Дебиторы</strong>, <strong>Кредиторы</strong>, <strong>Нулевые</strong>.</p>
            <p>Столбцы таблицы: <strong>Наименование · Тип · Телефон · Баланс · Кредитный лимит</strong>.</p>
            <p className="text-[hsl(var(--text-muted))]">Поля при создании: ФИО/Название, Тип, Телефон, Адрес, Кредитный лимит.</p>
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
        title: 'Отчёт по продажам (вкладка «Продажи»)',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Продажи за период (по умолчанию — последние 30 дней; даты «С»/«По» + «Обновить»).</p>
            <p>Сверху карточки: <strong>Выручка · Себестоимость · Прибыль</strong>. Таблица по товарам: <strong>Товар · Кол-во · Выручка · Себест. · Прибыль · Рентабельность</strong>.</p>
          </div>
        ),
      },
      {
        title: 'Остатки склада (вкладка «Склад»)',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Текущие остатки товаров. Есть поиск и переключатель <strong>«Низкий остаток»</strong> (заканчивающиеся позиции).</p>
            <p>Карточки: стоимость запасов по ценам продажи и по ценам покупки. Столбцы: <strong>Товар · SKU · Группа · Филиал · Остаток · Цена прод. · Цена пок. · Сумма</strong>.</p>
          </div>
        ),
      },
      {
        title: 'Балансы контрагентов (вкладка «Балансы»)',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Сводка задолженностей с фильтром по типу и поиском. Карточки: <strong>Дебиторы (нам должны) · Кредиторы (мы должны) · Нулевой баланс</strong>.</p>
            <p>Столбцы: <strong>Контрагент · Тип · Телефон · Дебит · Кредит · Баланс</strong>.</p>
          </div>
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
        title: 'Вкладки раздела «Настройки»',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Настройки разбиты на вкладки: <strong>Валюты и курсы</strong>, <strong>Кассы</strong>, <strong>Филиалы</strong>, <strong>Пользователи</strong>.
          </p>
        ),
      },
      {
        title: 'Валюты и курсы',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            На вкладке «Валюты и курсы» — две таблицы: список валют (базовая отмечена звёздочкой — в ней ведётся основной учёт) и курсы обмена. «Добавить» создаёт валюту (Код, Название, отметка «Базовая»); «Добавить курс» — курс для пары валют на дату.
          </p>
        ),
      },
      {
        title: 'Кассы и счета',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Вкладка «Кассы» показывает кассы и счета <strong>выбранного филиала</strong> (сначала выберите филиал в шапке). Столбцы: Название · Тип (Касса/Банк) · Валюта · Баланс. Они используются при проведении оплат и отражают реальный остаток денег.
          </p>
        ),
      },
      {
        title: 'Филиалы',
        content: (
          <p className="text-[hsl(var(--text-primary))] text-sm">
            Вкладка «Филиалы» — список точек компании (Название, Адрес). Кнопка «Добавить» создаёт новый филиал. Филиал выбирается активным в шапке сверху и определяет, чьи остатки и кассы вы видите.
          </p>
        ),
      },
      {
        title: 'Пользователи и роли',
        content: (
          <div className="space-y-2 text-sm text-[hsl(var(--text-primary))]">
            <p>Администратор добавляет сотрудников на вкладке «Пользователи» (Имя, Email, пароль, роль, филиал). Сверху — счётчики Всего / Активных / Неактивных.</p>
            <p>Роли: <strong>Admin</strong> — полный доступ; <strong>Manager</strong> — работа с документами и справочниками; <strong>Cashier</strong> — оплаты и документы.</p>
          </div>
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
