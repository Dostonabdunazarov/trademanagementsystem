import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../accounts'

export interface AccountDto {
  id: string
  name: string
  type: 'Cash' | 'Bank'
  currencyId: string
  currencyCode: string
  balance: number
  branchId: string
}

export interface CreateAccountDto {
  name: string
  type: 'Cash' | 'Bank'
  currencyId: string
  branchId: string
}

export function useAccounts(branchId?: string) {
  return useQuery<AccountDto[]>({
    queryKey: ['accounts', branchId],
    queryFn: () => accountsApi.getAll({ branchId }),
    staleTime: 5 * 60_000,
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
