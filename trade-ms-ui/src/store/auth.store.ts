import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  fullName: string
  email: string
  role: string
  companyId: string
  branchId: string | null
}

interface LoginResult {
  user: User
  accessToken: string
  refreshToken: string
}

interface AuthStore {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (result: LoginResult) => void
  logout: () => void
  setAccessToken: (token: string) => void
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
      setAccessToken: (token) => set({ accessToken: token }),
    }),
    { name: 'auth-storage' }
  )
)
