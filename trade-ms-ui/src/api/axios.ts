import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth.store'
import { clearSession } from '@/lib/session'
import { API_URL } from '@/utils/constants'
import type { LoginResponse } from './auth'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Запрос уже повторялся после 401 — второй раз refresh не запускаем. */
    _retry?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** `/auth/login`, `/auth/refresh`, `/auth/logout`: их 401 — ответ по существу, а не истёкший токен. */
function isAuthUrl(url: string | undefined): boolean {
  return !!url && /(^|\/)auth\//.test(url)
}

function sentToken(config: InternalAxiosRequestConfig): string | null {
  const header = config.headers?.Authorization
  if (typeof header !== 'string') return null
  return header.startsWith('Bearer ') ? header.slice(7) : header
}

/** Сервер отказал в refresh (токен отозван или истёк) — сессию не спасти. */
function isRefreshRejected(err: unknown): boolean {
  const status = (err as AxiosError | undefined)?.response?.status
  return status === 400 || status === 401 || status === 403
}

/**
 * Одна общая promise refresh на все параллельные 401: второй refresh со
 * старым (уже отозванным сервером) токеном разлогинил бы пользователя.
 */
let refreshPromise: Promise<string> | null = null

async function refreshTokens(): Promise<string> {
  const usedRefreshToken = useAuthStore.getState().refreshToken
  if (!usedRefreshToken) throw new Error('No refresh token')
  try {
    // Голый axios: без интерцепторов и без старого Authorization.
    const res = await axios.post<LoginResponse>(`${API_URL}/auth/refresh`, { refreshToken: usedRefreshToken })
    // Сервер ротирует refresh-токен — сохраняем оба токена и пользователя.
    const { user } = useAuthStore.getState()
    useAuthStore.getState().login({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      // Роль или филиал могли измениться — берём пользователя из ответа.
      user: res.data.user ?? user,
    })
    return res.data.accessToken
  } catch (err) {
    // Другая вкладка могла уже ротировать токен — берём её результат из localStorage.
    await useAuthStore.persist.rehydrate()
    const current = useAuthStore.getState()
    if (current.accessToken && current.refreshToken && current.refreshToken !== usedRefreshToken) {
      return current.accessToken
    }
    // Сеть, 429 и 5xx — временные сбои: сессию не сбрасываем, запрос просто падает.
    if (isRefreshRejected(err)) clearSession()
    throw err
  }
}

function getFreshAccessToken(): Promise<string> {
  refreshPromise ??= refreshTokens().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config
    if (!original || error.response?.status !== 401 || original._retry || isAuthUrl(original.url)) {
      return Promise.reject(error)
    }
    original._retry = true

    const { accessToken, refreshToken } = useAuthStore.getState()

    // Токен уже обновили (параллельный refresh или другая вкладка) — просто повторяем.
    if (accessToken && sentToken(original) !== accessToken) {
      original.headers.Authorization = `Bearer ${accessToken}`
      return apiClient(original)
    }

    if (!refreshToken) {
      // Без refresh-токена продлить сессию нельзя. PrivateRoute сам уведёт на /login.
      if (accessToken) clearSession()
      return Promise.reject(error)
    }

    try {
      const token = await getFreshAccessToken()
      original.headers.Authorization = `Bearer ${token}`
      return apiClient(original)
    } catch {
      // Отдаём исходный 401: getApiErrorMessage покажет «Сессия истекла».
      return Promise.reject(error)
    }
  },
)
