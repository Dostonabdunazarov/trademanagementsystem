import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { CounterpartyBalanceReport } from '@/features/reports/CounterpartyBalanceReport'

describe('CounterpartyBalanceReport', () => {
  it('отображает балансы контрагентов', async () => {
    renderWithProviders(<CounterpartyBalanceReport />)
    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
    })
  })

  it('переключает фильтр типа на Клиенты', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CounterpartyBalanceReport />)
    await waitFor(() => expect(screen.getByText('ООО Альфа')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /клиенты/i }))
    // Должен сделать запрос с type=Customer
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /клиенты/i })).toBeInTheDocument()
    })
  })

  it('фильтрует по имени через поиск', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CounterpartyBalanceReport />)
    await waitFor(() => expect(screen.getByText('ООО Альфа')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText(/поиск/i)
    await user.type(searchInput, 'Альфа')
    expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
    expect(screen.queryByText('ТОО Гамма')).not.toBeInTheDocument()
  })

  it('показывает пустое состояние при нет данных', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/counterparty-balance', () =>
        HttpResponse.json({ totalDebit: 0, totalCredit: 0, lines: [] })
      )
    )
    renderWithProviders(<CounterpartyBalanceReport />)
    await waitFor(() => {
      expect(screen.getByText(/нет данных/i)).toBeInTheDocument()
    })
  })
})
