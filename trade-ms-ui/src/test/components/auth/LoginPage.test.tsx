import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { renderWithProviders } from '../../utils/renderWithProviders'
import { LoginPage } from '@/features/auth/LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('LoginPage', () => {
  it('рендерит форму входа', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })

  it('показывает ошибку при пустом email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() => {
      expect(screen.getByText('Неверный формат email')).toBeInTheDocument()
    })
  })

  it('показывает ошибку при пустом пароле', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() => {
      expect(screen.getByText('Введите пароль')).toBeInTheDocument()
    })
  })

  it('показывает ошибку при неверных данных (401)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'wrong@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() => {
      expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument()
    })
  })

  it('успешный логин редиректит на главную', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'admin@company.com')
    await user.type(screen.getByLabelText('Пароль'), 'Admin123!')
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('переключает видимость пароля', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    const passwordInput = screen.getByLabelText('Пароль')
    expect(passwordInput).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Показать пароль' }))
    expect(passwordInput).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('блокирует кнопку во время загрузки', async () => {
    server.use(
      http.post('http://localhost:5000/api/auth/login', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({
          user: { id: '1', fullName: 'Test', email: 'a@b.com', role: 'Admin', companyId: 'c', branchId: 'b' },
          accessToken: 'tok',
          refreshToken: 'ref',
        })
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'admin@company.com')
    await user.type(screen.getByLabelText('Пароль'), 'Admin123!')
    await user.click(screen.getByRole('button', { name: 'Войти' }))
    expect(screen.getByRole('button', { name: /Вход/i })).toBeDisabled()
  })
})
