import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { SalesSummaryReport } from '@/features/reports/SalesSummaryReport'

describe('SalesSummaryReport', () => {
  it('отображает данные о продажах', async () => {
    renderWithProviders(<SalesSummaryReport />)
    await waitFor(() => {
      expect(screen.getByText('Ноутбук')).toBeInTheDocument()
    })
  })

  it('показывает KPI блоки: Выручка, Себестоимость, Прибыль', async () => {
    renderWithProviders(<SalesSummaryReport />)
    await waitFor(() => {
      // "Выручка" встречается в KPI и в заголовке таблицы — используем getAllByText
      expect(screen.getAllByText('Выручка').length).toBeGreaterThan(0)
      expect(screen.getByText('Себестоимость')).toBeInTheDocument()
      expect(screen.getAllByText('Прибыль').length).toBeGreaterThan(0)
    })
  })

  it('показывает пустое состояние при нет данных', async () => {
    server.use(
      http.get('http://localhost:5000/api/reports/sales-summary', () =>
        HttpResponse.json({
          dateFrom: '2026-05-01', dateTo: '2026-05-31',
          totalRevenue: 0, totalCost: 0, totalProfit: 0, totalDocuments: 0,
          lines: [],
        })
      )
    )
    renderWithProviders(<SalesSummaryReport />)
    await waitFor(() => {
      expect(screen.getByText('Нет данных за выбранный период')).toBeInTheDocument()
    })
  })

  it('имеет поля фильтра по дате', () => {
    renderWithProviders(<SalesSummaryReport />)
    const dateInputs = document.querySelectorAll('[data-date-picker]')
    expect(dateInputs.length).toBeGreaterThanOrEqual(2)
  })
})
