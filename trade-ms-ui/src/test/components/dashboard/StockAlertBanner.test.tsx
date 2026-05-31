import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { StockAlertBanner } from '@/components/dashboard/StockAlertBanner'
import { MOCK_STOCK_LOW } from '../../msw/handlers'

describe('StockAlertBanner', () => {
  it('показывает баннер когда есть товары с quantity <= 5', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/stock-balance', () => HttpResponse.json(MOCK_STOCK_LOW))
    )
    renderWithProviders(<StockAlertBanner />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    // Текст разбит на несколько текстовых нод — ищем контейнер span
    expect(document.body.textContent).toContain('Редкий товар')
    expect(document.body.textContent).toContain('3')
  })

  it('закрывается при нажатии кнопки закрыть', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/stock-balance', () => HttpResponse.json(MOCK_STOCK_LOW))
    )
    const user = userEvent.setup()
    renderWithProviders(<StockAlertBanner />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('не рендерится когда нет данных с низким остатком', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/stock-balance', () =>
        HttpResponse.json({
          totalSellValue: 0, totalBuyValue: 0,
          lines: [
            { productId: 'p1', productName: 'Полный склад', unit: 'pcs', quantity: 100, priceSell: 0, priceBuy: 0, totalSellValue: 0, totalBuyValue: 0, sku: null, groupName: 'G', branchId: 'b', branchName: 'B' }
          ]
        })
      )
    )
    const { container } = renderWithProviders(<StockAlertBanner />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('не рендерится при пустом складе', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/stock-balance', () =>
        HttpResponse.json({ totalSellValue: 0, totalBuyValue: 0, lines: [] })
      )
    )
    const { container } = renderWithProviders(<StockAlertBanner />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })
})
