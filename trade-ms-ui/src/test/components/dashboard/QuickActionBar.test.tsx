import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  beforeEach(() => mockNavigate.mockClear())

  it('рендерит все 6 кнопок быстрых действий (F5 не занята)', () => {
    renderWithProviders(<QuickActionBar />)
    for (const key of ['F1', 'F2', 'F3', 'F4', 'F6', 'F7']) {
      expect(screen.getByTitle((title) => title.endsWith(`(${key})`))).toBeInTheDocument()
    }
    expect(screen.queryByTitle((title) => title.endsWith('(F5)'))).not.toBeInTheDocument()
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

  it('F7 открывает выплату, F5 не перехватывается', () => {
    renderWithProviders(<QuickActionBar />)
    fireEvent.keyDown(window, { key: 'F5' })
    expect(mockNavigate).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'F7' })
    expect(mockNavigate).toHaveBeenCalledWith('/pay-out')
  })

  it('игнорирует клавиши с модификаторами и автоповтор', () => {
    renderWithProviders(<QuickActionBar />)
    fireEvent.keyDown(window, { key: 'F1', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'F1', shiftKey: true })
    fireEvent.keyDown(window, { key: 'F2', repeat: true })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('не перехватывает клавиши при вводе в поле', () => {
    renderWithProviders(
      <>
        <input aria-label="поле" />
        <QuickActionBar />
      </>,
    )
    const input = screen.getByLabelText('поле')
    input.focus()
    fireEvent.keyDown(input, { key: 'F1' })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
