import { apiClient } from './axios'

export interface AuditLogEntry {
  id: number
  userId: string | null
  userEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  details: string | null
  success: boolean
  errorMessage: string | null
  ipAddress: string | null
  createdAt: string
}

export interface AuditLogsResponse {
  items: AuditLogEntry[]
  totalCount: number
}

export interface AuditLogsParams {
  page: number
  pageSize: number
  userId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  success?: boolean
}

export async function fetchAuditLogs(params: AuditLogsParams): Promise<AuditLogsResponse> {
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('pageSize', String(params.pageSize))
  if (params.userId) query.set('userId', params.userId)
  if (params.action) query.set('action', params.action)
  if (params.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params.dateTo) query.set('dateTo', params.dateTo)
  if (params.success !== undefined) query.set('success', String(params.success))
  const { data } = await apiClient.get<AuditLogsResponse>(`/audit-logs?${query}`)
  return data
}
