import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { StockBalanceReport } from '@/features/reports/StockBalanceReport'

describe('StockBalanceReport', () => {
  it('отображает остатки товаров', async () => {
    renderWithProviders(<StockBalanceReport />)
    await waitFor(() => {
      expect(screen.getByText('Ноутбук')).toBeInTheDocument()
      expect(screen.getByText('Мышь')).toBeInTheDocument()
    })
  })

  it('фильтрует по поисковому запросу', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StockBalanceReport />)
    await waitFor(() => expect(screen.getByText('Ноутбук')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText(/поиск по товару/i)
    await user.type(searchInput, 'Ноутбук')
    expect(screen.getByText('Ноутбук')).toBeInTheDocument()
    expect(screen.queryByText('Мышь')).not.toBeInTheDocument()
  })

  it('фильтрует низкий остаток при нажатии кнопки', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/stock-balance', () =>
        HttpResponse.json({
          totalSellValue: 0, totalBuyValue: 0,
          lines: [
            { productId: 'p1', productName: 'Много', sku: null, unit: 'pcs', groupName: 'G', branchId: 'b', branchName: 'B', quantity: 100, priceSell: 0, priceBuy: 0, totalSellValue: 0, totalBuyValue: 0 },
            { productId: 'p2', productName: 'Мало', sku: null, unit: 'pcs', groupName: 'G', branchId: 'b', branchName: 'B', quantity: 2, priceSell: 0, priceBuy: 0, totalSellValue: 0, totalBuyValue: 0 },
          ],
        })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<StockBalanceReport />)
    await waitFor(() => {
      expect(screen.getByText('Много')).toBeInTheDocument()
      expect(screen.getByText('Мало')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /низкий остаток/i }))
    expect(screen.getByText('Мало')).toBeInTheDocument()
    expect(screen.queryByText('Много')).not.toBeInTheDocument()
  })

  it('показывает пустое состояние при нет данных', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/stock-balance', () =>
        HttpResponse.json({ totalSellValue: 0, totalBuyValue: 0, lines: [] })
      )
    )
    renderWithProviders(<StockBalanceReport />)
    await waitFor(() => {
      expect(screen.getByText(/нет данных/i)).toBeInTheDocument()
    })
  })
})
