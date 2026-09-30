import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../accounts'

/** AccountDto на бэкенде. */
export interface AccountDto {
  id: string
  companyId: string
  branchId: string
  name: string
  type: 'Cash' | 'Bank'
  currencyId: string
  currencyCode: string
  balance: number
}

/** CreateAccountRequest на бэкенде. */
export interface CreateAccountDto {
  name: string
  type: 'Cash' | 'Bank'
  currencyId: string
  branchId?: string | null
}

/**
 * Кассы. Для не-Admin сервер всегда отдаёт только кассы своего филиала;
 * Admin фильтрует по `branchId`, если он передан.
 */
export function useAccounts(branchId?: string, options: { enabled?: boolean } = {}) {
  return useQuery<AccountDto[]>({
    queryKey: ['accounts', branchId ?? null],
    queryFn: () => accountsApi.getAll(branchId ? { branchId } : undefined),
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccountDto) => accountsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
