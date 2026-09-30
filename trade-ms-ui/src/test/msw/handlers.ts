import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:5000/api'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 'user-1', fullName: 'Admin User', email: 'admin@company.com', role: 'Admin',
  companyId: 'co-1', companyName: 'Test Co', branchId: null,
}

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'admin@company.com' && body.password === 'Admin123!') {
      return HttpResponse.json({
        user: { ...MOCK_USER, email: body.email },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
      })
    }
    // Контракт: неверный пароль, неактивный или заблокированный аккаунт — всегда 401 invalidCredentials.
    return HttpResponse.json({ status: 401, code: 'invalidCredentials' }, { status: 401 })
  }),

  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refreshToken: string }
    if (body.refreshToken !== 'mock-refresh-token') return HttpResponse.json({ status: 401 }, { status: 401 })
    return HttpResponse.json({
      accessToken: 'mock-access-token-2',
      refreshToken: 'mock-refresh-token-2',
      tokenType: 'Bearer',
      user: MOCK_USER,
    })
  }),

  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
]

// ── Products ──────────────────────────────────────────────────────────────────

export const MOCK_GROUPS = [
  { id: 'grp-1', name: 'Электроника', parentId: null, children: [] },
  { id: 'grp-2', name: 'Одежда', parentId: null, children: [] },
]

export const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Ноутбук', sku: 'LAP-001', unit: 'Pcs', priceSell: 5000000, priceBuy: 4000000, currencyId: 'cur-1', currencyCode: 'UZS', companyId: 'co-1', groupId: 'grp-1', groupName: 'Электроника', barcode: null, isActive: true },
  { id: 'prod-2', name: 'Мышь', sku: 'MSE-001', unit: 'Pcs', priceSell: 150000, priceBuy: 100000, currencyId: 'cur-1', currencyCode: 'UZS', companyId: 'co-1', groupId: 'grp-1', groupName: 'Электроника', barcode: '4780000000017', isActive: true },
  { id: 'prod-3', name: 'Футболка', sku: 'TSH-001', unit: 'Pcs', priceSell: 80000, priceBuy: 50000, currencyId: 'cur-1', currencyCode: 'UZS', companyId: 'co-1', groupId: 'grp-2', groupName: 'Одежда', barcode: null, isActive: false },
]

export const productHandlers = [
  http.get(`${BASE}/product-groups`, () => HttpResponse.json(MOCK_GROUPS)),

  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url)
    const groupId = url.searchParams.get('groupId')
    const search = url.searchParams.get('search')
    let items = [...MOCK_PRODUCTS]
    if (groupId) items = items.filter((p) => p.groupId === groupId)
    if (search) items = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    return HttpResponse.json({ items, totalCount: items.length, page: 1, pageSize: 20 })
  }),

  http.post(`${BASE}/products`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ id: 'prod-new', ...body }, { status: 201 })
  }),

  http.put(`${BASE}/products/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const existing = MOCK_PRODUCTS.find((p) => p.id === params.id)
    return HttpResponse.json({ ...existing, ...body })
  }),

  http.delete(`${BASE}/products/:id`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${BASE}/product-groups`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ id: 'grp-new', ...body, children: [] }, { status: 201 })
  }),
]

// ── Counterparties ────────────────────────────────────────────────────────────

export const MOCK_COUNTERPARTIES = [
  { id: 'cp-1', companyId: 'co-1', name: 'ООО Альфа', type: 'Customer', phone: '+998901234567', address: 'Ташкент, ул. Навои, 5', balance: 250000, creditLimit: 1000000, createdAt: '2026-01-10T10:00:00Z' },
  { id: 'cp-2', companyId: 'co-1', name: 'ИП Бета', type: 'Supplier', phone: '+998901234568', address: null, balance: -100000, creditLimit: 0, createdAt: '2026-01-11T10:00:00Z' },
  { id: 'cp-3', companyId: 'co-1', name: 'ТОО Гамма', type: 'Customer', phone: null, address: null, balance: 0, creditLimit: 500000, createdAt: '2026-01-12T10:00:00Z' },
  { id: 'cp-4', companyId: 'co-1', name: 'ЧП Дельта', type: 'Both', phone: null, address: null, balance: 0, creditLimit: 0, createdAt: '2026-01-13T10:00:00Z' },
]

export const counterpartyHandlers = [
  http.get(`${BASE}/counterparties`, ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    let items = [...MOCK_COUNTERPARTIES]
    // Как на сервере: type=Customer/Supplier включает и Both.
    if (type) items = items.filter((c) => c.type === type || c.type === 'Both')
    return HttpResponse.json({ items, totalCount: items.length, page: 1, pageSize: 20 })
  }),

  http.post(`${BASE}/counterparties`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ id: 'cp-new', balance: 0, ...body }, { status: 201 })
  }),

  http.put(`${BASE}/counterparties/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const existing = MOCK_COUNTERPARTIES.find((c) => c.id === params.id)
    return HttpResponse.json({ ...existing, ...body })
  }),

  http.delete(`${BASE}/counterparties/:id`, () => new HttpResponse(null, { status: 204 })),
]

// ── Currencies ────────────────────────────────────────────────────────────────

export const MOCK_CURRENCIES = [
  { id: 'cur-1', code: 'UZS', name: 'Узбекский сум', isBase: true },
  { id: 'cur-2', code: 'USD', name: 'Доллар США', isBase: false },
]

export const MOCK_RATES = [
  { id: 'er-1', fromCurrencyId: 'cur-2', fromCurrencyCode: 'USD', toCurrencyId: 'cur-1', toCurrencyCode: 'UZS', rate: 12700, date: '2026-05-31' },
]

export const currencyHandlers = [
  http.get(`${BASE}/currencies`, () => HttpResponse.json(MOCK_CURRENCIES)),
  http.get(`${BASE}/exchange-rates`, ({ request }) => {
    const date = new URL(request.url).searchParams.get('date')
    return HttpResponse.json(date ? MOCK_RATES.filter((r) => r.date === date) : MOCK_RATES)
  }),
]

// ── Accounts / branches ───────────────────────────────────────────────────────

export const MOCK_BRANCHES = [
  { id: 'br-1', companyId: 'co-1', name: 'Главный офис', address: 'ул. Ленина 1' },
  { id: 'br-2', companyId: 'co-1', name: 'Склад', address: null },
]

export const MOCK_ACCOUNTS = [
  { id: 'acc-1', companyId: 'co-1', branchId: 'br-1', name: 'Касса офиса', type: 'Cash', currencyId: 'cur-1', currencyCode: 'UZS', balance: 500000 },
  { id: 'acc-2', companyId: 'co-1', branchId: 'br-1', name: 'Касса USD', type: 'Cash', currencyId: 'cur-2', currencyCode: 'USD', balance: 100 },
  { id: 'acc-3', companyId: 'co-1', branchId: 'br-2', name: 'Касса склада', type: 'Cash', currencyId: 'cur-1', currencyCode: 'UZS', balance: 0 },
]

export const accountHandlers = [
  http.get(`${BASE}/branches`, () => HttpResponse.json(MOCK_BRANCHES)),
  http.get(`${BASE}/accounts`, ({ request }) => {
    const branchId = new URL(request.url).searchParams.get('branchId')
    return HttpResponse.json(branchId ? MOCK_ACCOUNTS.filter((a) => a.branchId === branchId) : MOCK_ACCOUNTS)
  }),
]

// ── Documents ─────────────────────────────────────────────────────────────────

export const documentHandlers = [
  http.get(`${BASE}/documents`, () => HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 100 })),
]

// ── Reports ───────────────────────────────────────────────────────────────────

export const MOCK_STOCK_BALANCE = {
  totalSellValue: 10000000,
  totalBuyValue: 8000000,
  lines: [
    { productId: 'prod-1', productName: 'Ноутбук', sku: 'LAP-001', unit: 'Pcs', groupName: 'Электроника', branchId: 'br-1', branchName: 'Главный офис', quantity: 3, priceSell: 5000000, priceBuy: 4000000, totalSellValue: 15000000, totalBuyValue: 12000000 },
    { productId: 'prod-2', productName: 'Мышь', sku: 'MSE-001', unit: 'Pcs', groupName: 'Электроника', branchId: 'br-1', branchName: 'Главный офис', quantity: 2, priceSell: 150000, priceBuy: 100000, totalSellValue: 300000, totalBuyValue: 200000 },
  ],
}

export const MOCK_STOCK_LOW = {
  totalSellValue: 500000,
  totalBuyValue: 400000,
  lines: [
    { productId: 'prod-low', productName: 'Редкий товар', sku: 'RARE-001', unit: 'Pcs', groupName: 'Прочее', branchId: 'br-1', branchName: 'Главный офис', quantity: 3, priceSell: 100000, priceBuy: 80000, totalSellValue: 300000, totalBuyValue: 240000 },
  ],
}

export const MOCK_COUNTERPARTY_BALANCE = {
  totalDebit: 250000,
  totalCredit: 0,
  lines: [
    { id: 'cp-1', name: 'ООО Альфа', type: 'Customer', phone: '+998901234567', balance: 250000, creditLimit: 1000000 },
    { id: 'cp-3', name: 'ТОО Гамма', type: 'Customer', phone: null, balance: 0, creditLimit: 500000 },
  ],
}

export const MOCK_SALES_SUMMARY = {
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31',
  totalRevenue: 5000000,
  totalCost: 4000000,
  totalProfit: 1000000,
  totalDocuments: 3,
  lines: [
    { productId: 'prod-1', productName: 'Ноутбук', sku: 'LAP-001', unit: 'Pcs', quantitySold: 1, revenue: 5000000, cost: 4000000, profit: 1000000 },
  ],
}

export const MOCK_DASHBOARD = {
  dateFrom: '2026-06-01',
  dateTo: '2026-06-30',
  revenue: 5000000,
  profit: 1000000,
  debtorDebt: 250000,
  stockItemCount: 5,
  creditorDebt: 180000,
  cashIn: 3000000,
  cashOut: 1200000,
  salesCount: 42,
  averageCheck: 119047,
  stockBuyValue: 2400000,
  revenueDelta: 12.5,
  profitDelta: -3.2,
  cashFlowDelta: 8.0,
  salesCountDelta: 5.0,
  monthlySales: [
    { year: 2026, month: 1, monthLabel: 'Янв', revenue: 2000000, profit: 400000 },
    { year: 2026, month: 2, monthLabel: 'Фев', revenue: 3000000, profit: 600000 },
    { year: 2026, month: 5, monthLabel: 'Май', revenue: 5000000, profit: 1000000 },
  ],
}

export const reportHandlers = [
  http.get(`${BASE}/reports/stock-balance`, () => HttpResponse.json(MOCK_STOCK_BALANCE)),
  http.get(`${BASE}/reports/counterparty-balance`, () => HttpResponse.json(MOCK_COUNTERPARTY_BALANCE)),
  http.get(`${BASE}/reports/sales-summary`, () => HttpResponse.json(MOCK_SALES_SUMMARY)),
  http.get(`${BASE}/reports/dashboard`, () => HttpResponse.json(MOCK_DASHBOARD)),
]

// ── All handlers ──────────────────────────────────────────────────────────────

export const handlers = [
  ...authHandlers,
  ...productHandlers,
  ...counterpartyHandlers,
  ...currencyHandlers,
  ...accountHandlers,
  ...documentHandlers,
  ...reportHandlers,
]
