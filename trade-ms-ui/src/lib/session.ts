import { queryClient } from '@/lib/queryClient'
import { AUTH_STORAGE_KEY, useAuthStore } from '@/store/auth.store'
import { UI_STORAGE_KEY, useUiStore } from '@/store/ui.store'

/**
 * Локально завершает сессию: токены, кэш запросов (отчёты, пользователи, аудит
 * предыдущего пользователя) и активный филиал. Сервер здесь не вызывается —
 * отзыв refresh-токена делает `useLogout`.
 */
export function clearSession() {
  useAuthStore.getState().logout()
  useUiStore.getState().clearActiveBranch()
  queryClient.clear()
}

/**
 * Синхронизация вкладок: logout, login и ротация токенов в одной вкладке сразу
 * видны в остальных. Без этого вторая вкладка продолжает работать со старым
 * (уже отозванным) refresh-токеном или держит сессию вышедшего пользователя.
 * Возвращает функцию отписки.
 */
export function setupCrossTabAuthSync(): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.storageArea !== localStorage) return

    if (e.key === AUTH_STORAGE_KEY || e.key === null) {
      const prevUserId = useAuthStore.getState().user?.id ?? null
      if (e.key === null || e.newValue === null) {
        // localStorage очищен целиком или ключ удалён — считаем это выходом.
        useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
      } else {
        void useAuthStore.persist.rehydrate()
      }
      const next = useAuthStore.getState()
      if (!next.accessToken || (next.user?.id ?? null) !== prevUserId) {
        useUiStore.getState().clearActiveBranch()
        queryClient.clear()
      }
    }

    if (e.key === UI_STORAGE_KEY && e.newValue !== null) {
      void useUiStore.persist.rehydrate()
    }
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
