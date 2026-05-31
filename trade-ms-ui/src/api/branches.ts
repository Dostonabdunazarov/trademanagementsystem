import { apiClient } from './axios'

export interface BranchDto {
  id: string
  companyId: string
  name: string
  address: string | null
}

export const branchesApi = {
  getAll: (): Promise<BranchDto[]> =>
    apiClient.get('/branches').then((r) => r.data),
}
