import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { CounterpartiesPage } from '@/features/counterparties/CounterpartiesPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.stubGlobal('confirm', () => true)

describe('CounterpartiesPage', () => {
  it('отображает список контрагентов', async () => {
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
      expect(screen.getByText('ИП Бета')).toBeInTheDocument()
      expect(screen.getByText('ТОО Гамма')).toBeInTheDocument()
    })
  })

  it('показывает бейджи типов: Клиент и Поставщик', async () => {
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => {
      // Клиент (Customer) — отображается как "Клиент"
      expect(screen.getAllByText('Клиент').length).toBeGreaterThan(0)
      // Поставщик (Supplier)
      expect(screen.getByText('Поставщик')).toBeInTheDocument()
    })
  })

  it('фильтрует по типу Customer при клике на "Клиенты"', async () => {
    server.use(
      http.get('http://localhost:5000/api/counterparties', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        if (type === 'Customer') {
          return HttpResponse.json({
            items: [
              { id: 'cp-1', name: 'ООО Альфа', type: 'Customer', phone: '+998901234567', balance: 250000, creditLimit: 1000000 },
              { id: 'cp-3', name: 'ТОО Гамма', type: 'Customer', phone: null, balance: 0, creditLimit: 500000 },
            ],
            totalCount: 2, page: 1, pageSize: 20,
          })
        }
        return HttpResponse.json({
          items: [
            { id: 'cp-1', name: 'ООО Альфа', type: 'Customer', phone: '+998901234567', balance: 250000, creditLimit: 1000000 },
            { id: 'cp-2', name: 'ИП Бета', type: 'Supplier', phone: '+998901234568', balance: -100000, creditLimit: 0 },
            { id: 'cp-3', name: 'ТОО Гамма', type: 'Customer', phone: null, balance: 0, creditLimit: 500000 },
          ],
          totalCount: 3, page: 1, pageSize: 20,
        })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => expect(screen.getByText('ООО Альфа')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Клиенты' }))
    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
    })
    expect(screen.queryByText('ИП Бета')).not.toBeInTheDocument()
  })

  it('открывает форму создания контрагента', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => expect(screen.getByText('ООО Альфа')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Новый контрагент/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('форма создания — не отправляется без имени (required)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => expect(screen.getByText('ООО Альфа')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Новый контрагент/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    // Диалог должен остаться открытым после submit с пустым полем
    await user.click(screen.getByRole('button', { name: 'Создать' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('показывает пустое состояние "Контрагентов не найдено"', async () => {
    server.use(
      http.get('http://localhost:5000/api/counterparties', () =>
        HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 20 })
      )
    )
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => {
      expect(screen.getByText('Контрагентов не найдено')).toBeInTheDocument()
    })
  })

  it('показывает статистику: Дебиторы/Кредиторы/Нулевые', async () => {
    renderWithProviders(<CounterpartiesPage />)
    await waitFor(() => {
      expect(screen.getByText('ООО Альфа')).toBeInTheDocument()
    })
    expect(screen.getByText(/^Дебиторы:/)).toBeInTheDocument()
    expect(screen.getByText(/^Кредиторы:/)).toBeInTheDocument()
    expect(screen.getByText(/^Нулевые:/)).toBeInTheDocument()
  })
})
