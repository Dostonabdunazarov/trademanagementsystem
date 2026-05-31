import { apiClient } from './axios'

export const productsApi = {
  getAll: (params?: { search?: string; groupId?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/products', { params }).then((r) => r.data),

  create: (data: unknown) =>
    apiClient.post('/products', data).then((r) => r.data),

  update: (id: string, data: unknown) =>
    apiClient.put(`/products/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/products/${id}`).then((r) => r.data),

  getGroups: () =>
    apiClient.get('/product-groups').then((r) => r.data),

  createGroup: (data: unknown) =>
    apiClient.post('/product-groups', data).then((r) => r.data),
}
