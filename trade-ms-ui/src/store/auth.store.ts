import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, LoginResponse } from '@/api/auth'

export const AUTH_STORAGE_KEY = 'auth-storage'

interface AuthStore {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  /** Сохраняет ответ login/refresh целиком: оба токена и пользователя. */
  login: (result: Pick<LoginResponse, 'accessToken' | 'refreshToken'> & { user: AuthUser | null }) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (result) =>
        set({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)
