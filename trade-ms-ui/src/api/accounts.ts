import { apiClient } from './axios'

export const accountsApi = {
  getAll: (params?: { branchId?: string }) =>
    apiClient.get('/accounts', { params }).then((r) => r.data),

  create: (data: unknown) =>
    apiClient.post('/accounts', data).then((r) => r.data),

  update: (id: string, data: unknown) =>
    apiClient.put(`/accounts/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/accounts/${id}`).then((r) => r.data),
}
