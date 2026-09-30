import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'

export type TestRole = 'Admin' | 'Manager' | 'Cashier'

/** Кладёт в стор авторизованного пользователя с нужной ролью (админские кнопки скрыты от остальных). */
export function loginAs(role: TestRole = 'Admin', overrides: { branchId?: string | null } = {}) {
  useAuthStore.setState({
    user: {
      id: `user-${role.toLowerCase()}`,
      fullName: `${role} User`,
      email: `${role.toLowerCase()}@company.com`,
      role,
      companyId: 'co-1',
      companyName: 'Test Co',
      branchId: overrides.branchId !== undefined ? overrides.branchId : role === 'Admin' ? null : 'br-1',
    },
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
  })
}

export function resetStores() {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  useUiStore.setState({ activeBranch: null })
  localStorage.clear()
}
