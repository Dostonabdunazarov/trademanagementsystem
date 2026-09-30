import { apiClient } from './axios'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: string
  companyId: string
  companyName: string
  branchId: string | null
}

/** Ответ `/auth/login` и `/auth/refresh` (LoginResponse на бэкенде). */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  tokenType: string
}

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data),

  /** Отзывает refresh-токен на сервере. Требует действующий access-токен. */
  logout: (): Promise<void> =>
    apiClient.post('/auth/logout').then(() => undefined),
}
