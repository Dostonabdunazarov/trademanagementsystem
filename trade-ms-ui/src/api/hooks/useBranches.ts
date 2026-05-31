import { useQuery } from '@tanstack/react-query'
import { branchesApi, type BranchDto } from '../branches'

export type { BranchDto }

export function useBranches() {
  return useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
    staleTime: 5 * 60_000,
  })
}
