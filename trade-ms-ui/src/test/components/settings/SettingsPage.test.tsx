import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { SettingsPage } from '@/features/settings/SettingsPage'

function setupSettingsMocks() {
  server.use(
    http.get('http://localhost:5000/api/branches', () =>
      HttpResponse.json([
        { id: 'br-1', name: 'Главный офис', address: 'ул. Ленина 1', isMain: true },
        { id: 'br-2', name: 'Склад', address: 'ул. Склад 2', isMain: false },
      ])
    ),
    http.get('http://localhost:5000/api/exchange-rates', () =>
      HttpResponse.json([{ id: 'er-1', fromCurrencyId: 'cur-2', toCurrencyId: 'cur-1', rate: 12700, date: '2026-05-31' }])
    ),
    http.get('http://localhost:5000/api/accounts', () =>
      HttpResponse.json([{ id: 'acc-1', name: 'Основная касса', currencyId: 'cur-1', branchId: 'br-1', balance: 0 }])
    ),
    http.get('http://localhost:5000/api/users', () =>
      HttpResponse.json([
        { id: 'usr-1', fullName: 'Иван Иванов', email: 'ivan@company.com', role: 'Admin' },
        { id: 'usr-2', fullName: 'Петр Петров', email: 'petr@company.com', role: 'Manager' },
      ])
    ),
  )
}

describe('SettingsPage', () => {
  it('рендерит все 4 таба', () => {
    renderWithProviders(<SettingsPage />)
    // Используем точные тексты из ru.ts
    expect(screen.getByRole('button', { name: /Валюты и курсы/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Кассы/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Филиалы/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Пользователи/i })).toBeInTheDocument()
  })

  it('переключает на таб Филиалы и показывает данные', async () => {
    setupSettingsMocks()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /Филиалы/i }))
    await waitFor(() => {
      expect(screen.getByText('Главный офис')).toBeInTheDocument()
      expect(screen.getByText('Склад')).toBeInTheDocument()
    })
  })

  it('переключает на таб Пользователи и показывает данные', async () => {
    setupSettingsMocks()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /Пользователи/i }))
    await waitFor(() => {
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
      expect(screen.getByText('Петр Петров')).toBeInTheDocument()
    })
  })

  it('показывает валюты по умолчанию при открытии', async () => {
    renderWithProviders(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('UZS')).toBeInTheDocument()
      expect(screen.getByText('USD')).toBeInTheDocument()
    })
  })
})
