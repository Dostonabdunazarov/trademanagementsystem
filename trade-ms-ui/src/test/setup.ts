import '@testing-library/jest-dom'
import { server } from './msw/server'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { resetStores } from './utils/auth'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  resetStores()
})
afterAll(() => server.close())
