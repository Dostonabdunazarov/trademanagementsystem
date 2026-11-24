import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { useDocumentHotkeys } from '@/components/dashboard/useDocumentHotkeys'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function Host() {
  useDocumentHotkeys()
  return null
}

describe('useDocumentHotkeys', () => {
  beforeEach(() => mockNavigate.mockClear())

  it.each([
    ['F1', '/expense'],
    ['F2', '/income'],
    ['F3', '/return-customer'],
    ['F4', '/return-supplier'],
    ['F6', '/pay-in'],
    ['F7', '/pay-out'],
  ])('%s открывает %s', (key, to) => {
    renderWithProviders(<Host />)
    fireEvent.keyDown(window, { key })
    expect(mockNavigate).toHaveBeenCalledWith(to)
  })

  it('F5 не перехватывается', () => {
    renderWithProviders(<Host />)
    fireEvent.keyDown(window, { key: 'F5' })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('игнорирует клавиши с модификаторами и автоповтор', () => {
    renderWithProviders(<Host />)
    fireEvent.keyDown(window, { key: 'F1', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'F1', shiftKey: true })
    fireEvent.keyDown(window, { key: 'F2', repeat: true })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('не перехватывает клавиши при вводе в поле', () => {
    renderWithProviders(
      <>
        <input aria-label="поле" />
        <Host />
      </>,
    )
    const input = screen.getByLabelText('поле')
    input.focus()
    fireEvent.keyDown(input, { key: 'F1' })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
