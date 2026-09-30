import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../msw/server'
import { apiClient } from '@/api/axios'
import { useAuthStore } from '@/store/auth.store'

const BASE = 'http://localhost:5000/api'

const oldUser = {
  id: 'user-1', fullName: 'Old Name', email: 'a@b.com', role: 'Manager',
  companyId: 'co-1', companyName: 'Test Co', branchId: 'br-1',
}
const newUser = { ...oldUser, fullName: 'New Name' }

/** Защищённый ресурс: пускает только с текущим access-токеном «сервера». */
function protectedResource(validToken: () => string) {
  return http.get(`${BASE}/ping`, ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${validToken()}`
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json({ status: 401 }, { status: 401 }),
  )
}

describe('apiClient: refresh по 401', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: oldUser, accessToken: 'access-old', refreshToken: 'refresh-old' })
  })

  it('сохраняет оба ротированных токена и пользователя; параллельные 401 делят один refresh', async () => {
    let refreshCalls = 0
    server.use(
      protectedResource(() => 'access-new'),
      http.post(`${BASE}/auth/refresh`, async ({ request }) => {
        refreshCalls++
        const body = await request.json() as { refreshToken: string }
        expect(body.refreshToken).toBe('refresh-old')
        return HttpResponse.json({ accessToken: 'access-new', refreshToken: 'refresh-new', user: newUser, tokenType: 'Bearer' })
      }),
    )

    const results = await Promise.all([apiClient.get('/ping'), apiClient.get('/ping'), apiClient.get('/ping')])

    expect(results.every((r) => r.data.ok)).toBe(true)
    expect(refreshCalls).toBe(1)
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-new')
    expect(state.refreshToken).toBe('refresh-new')
    expect(state.user?.fullName).toBe('New Name')
  })

  it('если токен уже обновлён, просто повторяет запрос без refresh', async () => {
    let refreshCalls = 0
    server.use(
      protectedResource(() => 'access-current'),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({ status: 401 }, { status: 401 })
      }),
    )
    // Запрос уходит со старым токеном, а к моменту 401 в сторе уже новый (refresh в другой вкладке).
    const request = apiClient.get('/ping', { headers: { Authorization: 'Bearer access-old' } })
    useAuthStore.setState({ accessToken: 'access-current', refreshToken: 'refresh-current' })
    const res = await request
    expect(res.data.ok).toBe(true)
    expect(refreshCalls).toBe(0)
  })

  it('не делает refresh на 401 от /auth/login и не трогает сессию', async () => {
    let refreshCalls = 0
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ status: 401, code: 'invalidCredentials' }, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({})
      }),
    )
    await expect(apiClient.post('/auth/login', { email: 'x@y.z', password: 'bad' }))
      .rejects.toMatchObject({ response: { status: 401 } })
    expect(refreshCalls).toBe(0)
    expect(useAuthStore.getState().refreshToken).toBe('refresh-old')
  })

  it('без refresh-токена не вызывает refresh', async () => {
    let refreshCalls = 0
    useAuthStore.setState({ refreshToken: null })
    server.use(
      protectedResource(() => 'never'),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({})
      }),
    )
    await expect(apiClient.get('/ping')).rejects.toMatchObject({ response: { status: 401 } })
    expect(refreshCalls).toBe(0)
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('отказ сервера в refresh завершает сессию', async () => {
    server.use(
      protectedResource(() => 'never'),
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ status: 401 }, { status: 401 })),
    )
    await expect(apiClient.get('/ping')).rejects.toMatchObject({ response: { status: 401 } })
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.user).toBeNull()
  })

  it('429 на refresh не разлогинивает', async () => {
    server.use(
      protectedResource(() => 'never'),
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 429 })),
    )
    await expect(apiClient.get('/ping')).rejects.toBeTruthy()
    expect(useAuthStore.getState().refreshToken).toBe('refresh-old')
  })
})
