import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { loginAs } from '../../utils/auth'
import { PaymentForm } from '@/features/documents/PaymentForm'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const BASE = 'http://localhost:5000/api'

const DRAFT = {
  id: 42, companyId: 'co-1', branchId: 'br-1', type: 'PayIn', number: 'PI-2026-0042', date: '2026-09-20',
  counterpartyId: 'cp-1', counterpartyName: 'ООО Альфа', currencyId: 'cur-1', currencyCode: 'UZS', exchangeRate: 1,
  totalAmount: 150000, totalAmountBase: 150000, discountPercent: 0, discountAmount: 0, note: 'аванс',
  amount: 150000, paymentMethod: 'Cash', accountId: 'acc-1', accountName: 'Касса офиса', status: 'Draft',
  createdBy: 'user-cashier', createdAt: '2026-09-20T09:00:00Z', confirmedAt: null, lines: [],
}

function setupDraftApi() {
  const calls = { put: [] as unknown[], confirm: [] as number[], post: 0 }
  server.use(
    http.get(`${BASE}/documents/42`, () => HttpResponse.json(DRAFT)),
    http.put(`${BASE}/documents/:id`, async ({ params, request }) => {
      calls.put.push({ id: Number(params.id), body: await request.json() })
      return HttpResponse.json(DRAFT)
    }),
    http.post(`${BASE}/documents/:id/confirm`, ({ params }) => {
      calls.confirm.push(Number(params.id))
      return HttpResponse.json({ ...DRAFT, status: 'Confirmed' })
    }),
    http.post(`${BASE}/documents`, () => {
      calls.post++
      return HttpResponse.json({ ...DRAFT, id: 99 }, { status: 201 })
    }),
  )
  return calls
}

describe('PaymentForm: черновик из журнала (?id=)', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    loginAs('Cashier', { branchId: 'br-1' })
  })

  it('«Провести» обновляет и проводит тот же документ (PUT + confirm), без POST', async () => {
    const calls = setupDraftApi()
    const user = userEvent.setup()
    renderWithProviders(<PaymentForm type="PayIn" title="Приём оплаты" />, { initialEntries: ['/pay-in?id=42'] })

    await waitFor(() => expect(screen.getByDisplayValue('150000')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Провести/ }))

    await waitFor(() => expect(calls.confirm).toEqual([42]))
    expect(calls.post).toBe(0)
    expect(calls.put).toHaveLength(1)
    expect(calls.put[0]).toMatchObject({
      id: 42,
      body: { lines: [], amount: 150000, paymentMethod: 'Cash', accountId: 'acc-1', counterpartyId: 'cp-1', date: '2026-09-20' },
    })
    expect(mockNavigate).toHaveBeenCalledWith('/pay-ins')
  })

  it('«Сохранить черновик» делает PUT того же id, без POST и без проведения', async () => {
    const calls = setupDraftApi()
    const user = userEvent.setup()
    renderWithProviders(<PaymentForm type="PayIn" title="Приём оплаты" />, { initialEntries: ['/pay-in?id=42'] })

    await waitFor(() => expect(screen.getByDisplayValue('150000')).toBeInTheDocument())
    await user.clear(screen.getByDisplayValue('150000'))
    await user.type(screen.getByPlaceholderText('0'), '200000')
    await user.click(screen.getByRole('button', { name: /Сохранить черновик/ }))

    await waitFor(() => expect(calls.put).toHaveLength(1))
    expect(calls.put[0]).toMatchObject({ id: 42, body: { amount: 200000, lines: [] } })
    expect(calls.post).toBe(0)
    expect(calls.confirm).toEqual([])
  })

  it('в списке касс только касса своего филиала в базовой валюте', async () => {
    setupDraftApi()
    renderWithProviders(<PaymentForm type="PayIn" title="Приём оплаты" />, { initialEntries: ['/pay-in?id=42'] })

    await waitFor(() => expect(screen.getByDisplayValue('150000')).toBeInTheDocument())
    // Подходит ровно одна касса (свой филиал + базовая валюта) — она и выбрана.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Касса \/ Счёт/ })).toHaveTextContent('Касса офиса'))
    expect(screen.queryByText('Касса USD')).not.toBeInTheDocument()
    expect(screen.queryByText('Касса склада')).not.toBeInTheDocument()
  })
})
