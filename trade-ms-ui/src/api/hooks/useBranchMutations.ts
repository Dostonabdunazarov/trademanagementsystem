import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../axios'
import type { BranchDto } from '../branches'

interface CreateBranchData {
  name: string
  address?: string | null
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation<BranchDto, Error, CreateBranchData>({
    mutationFn: (data) => apiClient.post('/branches', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export function useDeleteBranch() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.delete(`/branches/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}
