import { apiClient } from './axios'

export const counterpartiesApi = {
  getAll: (params?: { type?: string; search?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/counterparties', { params }).then((r) => r.data),

  create: (data: unknown) =>
    apiClient.post('/counterparties', data).then((r) => r.data),

  update: (id: string, data: unknown) =>
    apiClient.put(`/counterparties/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/counterparties/${id}`).then((r) => r.data),
}
