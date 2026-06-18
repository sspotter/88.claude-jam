import { describe, it, expect } from 'vitest'
import { normalizeAuditQuery } from './audit.service.js'

describe('normalizeAuditQuery', () => {
	it('defaults limit to 50 and offset to 0', () => {
		expect(normalizeAuditQuery({})).toEqual({ entity: undefined, action: undefined, limit: 50, offset: 0 })
	})
	it('clamps limit to a max of 100', () => {
		expect(normalizeAuditQuery({ limit: 999 }).limit).toBe(100)
	})
	it('clamps limit to a min of 1', () => {
		expect(normalizeAuditQuery({ limit: 0 }).limit).toBe(1)
		expect(normalizeAuditQuery({ limit: -5 }).limit).toBe(1)
	})
	it('floors a negative offset at 0', () => {
		expect(normalizeAuditQuery({ offset: -10 }).offset).toBe(0)
	})
	it('passes through entity and action and coerces string numbers', () => {
		expect(normalizeAuditQuery({ entity: 'product', action: 'update', limit: '20', offset: '40' })).toEqual({
			entity: 'product', action: 'update', limit: 20, offset: 40,
		})
	})
})
