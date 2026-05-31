import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { QuickActionBar } from '@/components/dashboard/QuickActionBar'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('QuickActionBar', () => {
  it('рендерит все 6 кнопок быстрых действий', () => {
    renderWithProviders(<QuickActionBar />)
    // Каждая кнопка имеет title с F1-F6
    expect(screen.getByTitle(/F1/)).toBeInTheDocument()
    expect(screen.getByTitle(/F2/)).toBeInTheDocument()
    expect(screen.getByTitle(/F3/)).toBeInTheDocument()
    expect(screen.getByTitle(/F4/)).toBeInTheDocument()
    expect(screen.getByTitle(/F5/)).toBeInTheDocument()
    expect(screen.getByTitle(/F6/)).toBeInTheDocument()
  })

  it('навигирует на /expense при клике F1', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickActionBar />)
    await user.click(screen.getByTitle(/F1/))
    expect(mockNavigate).toHaveBeenCalledWith('/expense')
  })

  it('навигирует на /income при клике F2', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickActionBar />)
    await user.click(screen.getByTitle(/F2/))
    expect(mockNavigate).toHaveBeenCalledWith('/income')
  })

  it('навигирует на /pay-in при клике F6', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickActionBar />)
    await user.click(screen.getByTitle(/F6/))
    expect(mockNavigate).toHaveBeenCalledWith('/pay-in')
  })

  it('навигирует при нажатии клавиши F1', () => {
    renderWithProviders(<QuickActionBar />)
    fireEvent.keyDown(window, { key: 'F1' })
    expect(mockNavigate).toHaveBeenCalledWith('/expense')
  })

  it('навигирует при нажатии клавиши F2', () => {
    renderWithProviders(<QuickActionBar />)
    fireEvent.keyDown(window, { key: 'F2' })
    expect(mockNavigate).toHaveBeenCalledWith('/income')
  })
})
