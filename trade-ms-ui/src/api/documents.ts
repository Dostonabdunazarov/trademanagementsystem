import { apiClient } from './axios'

export const documentsApi = {
  getAll: (params?: { type?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number; status?: string; branchId?: string }) =>
    apiClient.get('/documents', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get(`/documents/${id}`).then((r) => r.data),

  create: (data: unknown) =>
    apiClient.post('/documents', data).then((r) => r.data),

  update: (id: number, data: unknown) =>
    apiClient.put(`/documents/${id}`, data).then((r) => r.data),

  confirm: (id: number) =>
    apiClient.post(`/documents/${id}/confirm`).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/documents/${id}`).then((r) => r.data),
}
