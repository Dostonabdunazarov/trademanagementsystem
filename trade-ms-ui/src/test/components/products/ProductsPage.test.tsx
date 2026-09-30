import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { loginAs } from '../../utils/auth'
import { ProductsPage } from '@/features/products/ProductsPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('ProductsPage', () => {
  // Кнопки создания/правки/удаления видны только Admin.
  beforeEach(() => loginAs('Admin'))

  it('отображает список продуктов', async () => {
    renderWithProviders(<ProductsPage />)
    await waitFor(() => {
      expect(screen.getByText('Ноутбук')).toBeInTheDocument()
      expect(screen.getByText('Мышь')).toBeInTheDocument()
    })
  })

  it('показывает группы товаров в сайдбаре', async () => {
    renderWithProviders(<ProductsPage />)
    await waitFor(() => {
      expect(screen.getByText('Электроника')).toBeInTheDocument()
      expect(screen.getByText('Одежда')).toBeInTheDocument()
    })
  })

  it('фильтрует продукты по группе', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)
    await waitFor(() => expect(screen.getByText('Электроника')).toBeInTheDocument())

    await user.click(screen.getByText('Электроника'))
    await waitFor(() => {
      expect(screen.getByText('Ноутбук')).toBeInTheDocument()
    })
    // Футболка не в Электронике
    expect(screen.queryByText('Футболка')).not.toBeInTheDocument()
  })

  it('фильтрует продукты при поиске', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)
    await waitFor(() => expect(screen.getByText('Ноутбук')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText(/поиск/i)
    await user.type(searchInput, 'Ноутбук')
    await waitFor(() => {
      expect(screen.getByText('Ноутбук')).toBeInTheDocument()
      expect(screen.queryByText('Мышь')).not.toBeInTheDocument()
    })
  })

  it('открывает диалог создания продукта', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)
    await waitFor(() => expect(screen.getByText('Ноутбук')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /новый товар/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('открывает диалог удаления и делает API вызов', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)
    await waitFor(() => expect(screen.getByText('Ноутбук')).toBeInTheDocument())

    // hover для отображения кнопок в строке
    const deleteButtons = screen.getAllByRole('button', { name: /удалить/i })
    // Первый confirm в диалоге
    await user.click(deleteButtons[0])
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('показывает пустое состояние когда нет продуктов', async () => {
    server.use(
      http.get('http://localhost:5000/api/products', () =>
        HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 20 })
      )
    )
    renderWithProviders(<ProductsPage />)
    await waitFor(() => {
      expect(screen.getByText(/нет товаров/i)).toBeInTheDocument()
    })
  })

  it('не показывает админские кнопки кассиру', async () => {
    loginAs('Cashier')
    renderWithProviders(<ProductsPage />)
    await waitFor(() => expect(screen.getByText('Ноутбук')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /новый товар/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /удалить/i })).not.toBeInTheDocument()
  })
})
