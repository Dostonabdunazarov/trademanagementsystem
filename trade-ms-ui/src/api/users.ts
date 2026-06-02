import { apiClient } from './axios'

export const usersApi = {
  getAll: () =>
    apiClient.get('/users').then((r) => r.data),

  create: (data: unknown) =>
    apiClient.post('/users', data).then((r) => r.data),

  update: (id: string, data: unknown) =>
    apiClient.put(`/users/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/users/${id}`).then((r) => r.data),
}
