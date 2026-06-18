import { apiFetch } from './client.js'

export interface AuditLogRow {
	id: string
	createdAt: string
	actorId: string
	actorEmail: string
	action: string
	entity: string
	entityId: string | null
	before: unknown
	after: unknown
}

export interface AuditLogQuery {
	entity?: string
	action?: string
	limit?: number
	offset?: number
}

export function listAuditLogs(
	params: AuditLogQuery = {},
): Promise<{ logs: AuditLogRow[]; total: number }> {
	const qs = new URLSearchParams()
	if (params.entity) qs.set('entity', params.entity)
	if (params.action) qs.set('action', params.action)
	if (params.limit !== undefined) qs.set('limit', String(params.limit))
	if (params.offset !== undefined) qs.set('offset', String(params.offset))
	const query = qs.toString()
	return apiFetch<{ logs: AuditLogRow[]; total: number }>(
		`/api/admin/audit-logs${query ? `?${query}` : ''}`,
		{ auth: true },
	)
}
