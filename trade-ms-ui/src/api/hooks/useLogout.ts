import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../auth'
import { clearSession } from '@/lib/session'

/**
 * Выход: отзываем refresh-токен на сервере (ошибки не мешают выйти), затем
 * чистим кэш запросов, активный филиал и токены.
 */
export function useLogout() {
  const navigate = useNavigate()
  return useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Сервер недоступен или токен уже недействителен — локальный выход всё равно нужен.
    }
    clearSession()
    navigate('/login', { replace: true })
  }, [navigate])
}
