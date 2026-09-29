import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { CounterpartyBalanceWidget } from '@/components/dashboard/CounterpartyBalanceWidget'

describe('CounterpartyBalanceWidget', () => {
  it('показывает skeleton при загрузке', () => {
    const { container } = renderWithProviders(<CounterpartyBalanceWidget />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('отображает список должников после загрузки', async () => {
    renderWithProviders(<CounterpartyBalanceWidget />)
    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
    })
    // balance: 250000 отформатирован
    expect(screen.getByText(/250\s*000/)).toBeInTheDocument()
  })

  it('не показывает контрагентов с нулевым балансом', async () => {
    renderWithProviders(<CounterpartyBalanceWidget />)
    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
    })
    expect(screen.queryByText('ТОО Гамма')).not.toBeInTheDocument()
  })

  it('показывает сообщение о нет дебиторской задолженности когда список пустой', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/counterparty-balance', () =>
        HttpResponse.json({ totalDebit: 0, totalCredit: 0, lines: [] })
      )
    )
    renderWithProviders(<CounterpartyBalanceWidget />)
    await waitFor(() => {
      expect(screen.getByText('Нет дебиторской задолженности')).toBeInTheDocument()
    })
  })

  it('отображает максимум 5 должников', async () => {
    const lines = Array.from({ length: 8 }, (_, i) => ({
      id: `cp-${i}`,
      name: `Контрагент ${i + 1}`,
      type: 'Customer',
      phone: null,
      balance: (8 - i) * 10000,
      creditLimit: 0,
    }))
    server.use(
      http.get('http://localhost:5000/api/reports/counterparty-balance', () =>
        HttpResponse.json({ totalDebit: 100000, totalCredit: 0, lines })
      )
    )
    renderWithProviders(<CounterpartyBalanceWidget />)
    await waitFor(() => {
      expect(screen.getByText('Контрагент 1')).toBeInTheDocument()
    })
    expect(screen.queryByText('Контрагент 6')).not.toBeInTheDocument()
  })

  it('красит должника по кредитному лимиту, а не по сравнению с крупнейшим', async () => {
    const line = (name: string, balance: number, creditLimit: number) =>
      ({ id: name, name, type: 'Customer', phone: null, balance, creditLimit })
    server.use(
      http.get('http://localhost:5000/api/reports/counterparty-balance', () =>
        HttpResponse.json({
          totalDebit: 0,
          totalCredit: 0,
          lines: [
            line('Крупный в лимите', 100_000_000, 200_000_000),
            line('Превысил', 5_000_000, 1_000_000),
            line('У лимита', 900_000, 1_000_000),
            line('Без лимита', 300_000, 0),
          ],
        })
      )
    )
    renderWithProviders(<CounterpartyBalanceWidget />)
    await waitFor(() => {
      expect(screen.getByText('Превысил')).toBeInTheDocument()
    })
    const riskOf = (name: string) => screen.getByText(name).closest('[data-risk]')?.getAttribute('data-risk')
    expect(riskOf('Крупный в лимите')).toBe('ok')
    expect(riskOf('Превысил')).toBe('over')
    expect(riskOf('У лимита')).toBe('near')
    expect(riskOf('Без лимита')).toBe('noLimit')
  })
})
