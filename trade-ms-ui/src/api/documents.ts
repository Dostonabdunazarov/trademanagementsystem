import { apiClient } from './axios'

export interface DocumentsQuery {
  type?: string
  dateFrom?: string
  dateTo?: string
  counterpartyId?: string
  status?: string
  branchId?: string
  /** ILIKE по номеру документа и имени контрагента. */
  search?: string
  page?: number
  /** Сервер ограничивает 1..200. */
  pageSize?: number
}

export const documentsApi = {
  getAll: (params?: DocumentsQuery) =>
    apiClient.get('/documents', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get(`/documents/${id}`).then((r) => r.data),

  create: (data: unknown) =>
    apiClient.post('/documents', data).then((r) => r.data),

  update: (id: number, data: unknown) =>
    apiClient.put(`/documents/${id}`, data).then((r) => r.data),

  confirm: (id: number) =>
    apiClient.post(`/documents/${id}/confirm`).then((r) => r.data),

  cancel: (id: number) =>
    apiClient.post(`/documents/${id}/cancel`).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/documents/${id}`).then((r) => r.data),
}
