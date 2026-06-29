import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:5000/api'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'admin@company.com' && body.password === 'Admin123!') {
      return HttpResponse.json({
        user: { id: 'user-1', fullName: 'Admin User', email: body.email, role: 'Admin', companyId: 'co-1', branchId: 'br-1' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })
    }
    return new HttpResponse(null, { status: 401 })
  }),
]

// ── Products ──────────────────────────────────────────────────────────────────

export const MOCK_GROUPS = [
  { id: 'grp-1', name: 'Электроника', parentId: null, children: [] },
  { id: 'grp-2', name: 'Одежда', parentId: null, children: [] },
]

export const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Ноутбук', sku: 'LAP-001', unit: 'pcs', priceSell: 5000000, priceBuy: 4000000, currencyId: 'cur-1', groupId: 'grp-1', isActive: true },
  { id: 'prod-2', name: 'Мышь', sku: 'MSE-001', unit: 'pcs', priceSell: 150000, priceBuy: 100000, currencyId: 'cur-1', groupId: 'grp-1', isActive: true },
  { id: 'prod-3', name: 'Футболка', sku: 'TSH-001', unit: 'pcs', priceSell: 80000, priceBuy: 50000, currencyId: 'cur-1', groupId: 'grp-2', isActive: false },
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
  { id: 'cp-1', name: 'ООО Альфа', type: 'Customer', phone: '+998901234567', balance: 250000, creditLimit: 1000000 },
  { id: 'cp-2', name: 'ИП Бета', type: 'Supplier', phone: '+998901234568', balance: -100000, creditLimit: 0 },
  { id: 'cp-3', name: 'ТОО Гамма', type: 'Customer', phone: null, balance: 0, creditLimit: 500000 },
]

export const counterpartyHandlers = [
  http.get(`${BASE}/counterparties`, ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    let items = [...MOCK_COUNTERPARTIES]
    if (type) items = items.filter((c) => c.type === type)
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

export const currencyHandlers = [
  http.get(`${BASE}/currencies`, () => HttpResponse.json(MOCK_CURRENCIES)),
]

// ── Reports ───────────────────────────────────────────────────────────────────

export const MOCK_STOCK_BALANCE = {
  totalSellValue: 10000000,
  totalBuyValue: 8000000,
  lines: [
    { productId: 'prod-1', productName: 'Ноутбук', sku: 'LAP-001', unit: 'pcs', groupName: 'Электроника', branchId: 'br-1', branchName: 'Главный офис', quantity: 3, priceSell: 5000000, priceBuy: 4000000, totalSellValue: 15000000, totalBuyValue: 12000000 },
    { productId: 'prod-2', productName: 'Мышь', sku: 'MSE-001', unit: 'pcs', groupName: 'Электроника', branchId: 'br-1', branchName: 'Главный офис', quantity: 2, priceSell: 150000, priceBuy: 100000, totalSellValue: 300000, totalBuyValue: 200000 },
  ],
}

export const MOCK_STOCK_LOW = {
  totalSellValue: 500000,
  totalBuyValue: 400000,
  lines: [
    { productId: 'prod-low', productName: 'Редкий товар', sku: 'RARE-001', unit: 'pcs', groupName: 'Прочее', branchId: 'br-1', branchName: 'Главный офис', quantity: 3, priceSell: 100000, priceBuy: 80000, totalSellValue: 300000, totalBuyValue: 240000 },
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
    { productId: 'prod-1', productName: 'Ноутбук', sku: 'LAP-001', unit: 'pcs', quantitySold: 1, revenue: 5000000, cost: 4000000, profit: 1000000 },
  ],
}

export const MOCK_DASHBOARD = {
  dateFrom: '2026-06-01',
  dateTo: '2026-06-30',
  revenue: 5000000,
  profit: 1000000,
  debtorDebt: 250000,
  stockItemCount: 5,
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
  ...reportHandlers,
]
