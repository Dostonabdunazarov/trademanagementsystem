import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../axios'
import type { BranchDto } from '../branches'
import { useUiStore } from '@/store/ui.store'

interface CreateBranchData {
  name: string
  address?: string | null
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation<BranchDto, unknown, CreateBranchData>({
    mutationFn: (data) => apiClient.post('/branches', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export function useDeleteBranch() {
  const qc = useQueryClient()
  return useMutation<void, unknown, string>({
    mutationFn: (id) => apiClient.delete(`/branches/${id}`).then((r) => r.data),
    onSuccess: (_data, id) => {
      // Удалённый филиал не должен оставаться активным и уходить в branchId запросов.
      const { activeBranch, clearActiveBranch } = useUiStore.getState()
      if (activeBranch?.id === id) clearActiveBranch()
      qc.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}
