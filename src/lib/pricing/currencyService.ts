import { apiFetch } from '../api/client'
import type { CurrencyCode, CurrencyRate } from '../../types/pricing'
import {
	BASE_CURRENCY,
	SUPPORTED_CURRENCIES,
} from './constants'

export interface SyncResult {
	success: boolean
	provider: string | null
	ratesUpdated: number
	syncedAt: number
	error?: string
}

interface RatesPayload {
	rates: Array<{
		baseCurrency: string
		targetCurrency: string
		rate: number
		provider: string
		syncedAt: number
		createdAt: number
		updatedAt: number
	}>
	syncMeta: {
		lastSyncAt: number | null
		provider: string | null
		status: string | null
		error?: string
	}
}

function rateDocId(base: string, target: string): string {
	return `${base}_${target}`
}

async function getRatesPayload(): Promise<RatesPayload> {
	return apiFetch<RatesPayload>('/api/pricing/rates')
}

async function saveRatesPayload(payload: RatesPayload): Promise<void> {
	await apiFetch('/api/admin/pricing/rates', {
		method: 'PUT',
		auth: true,
		body: JSON.stringify(payload),
	})
}

export async function fetchRatesFromProvider(base: CurrencyCode): Promise<{
	rates: Record<string, number>
	provider: string
	date: string
}> {
	const code = base.toLowerCase()
	const endpoints = [
		{ url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`, provider: 'jsdelivr' },
		{ url: `https://latest.currency-api.pages.dev/v1/currencies/${code}.json`, provider: 'pages.dev' },
	]
	let lastError: Error | null = null
	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint.url)
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const data = (await response.json()) as { date?: string } & Record<string, Record<string, number>>
			const rates = data[code]
			if (!rates) throw new Error(`Invalid API response: missing ${code} rates`)
			return { rates, provider: endpoint.provider, date: data.date ?? new Date().toISOString().slice(0, 10) }
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err))
		}
	}
	throw lastError ?? new Error('All exchange rate providers failed')
}

export async function syncExchangeRates(base: CurrencyCode): Promise<SyncResult> {
	const now = Date.now()
	try {
		const { rates, provider } = await fetchRatesFromProvider(base)
		const existing = await getRatesPayload()
		const rateRows = [...existing.rates]
		let updated = 0
		for (const currency of SUPPORTED_CURRENCIES) {
			if (currency === base) continue
			const rate = rates[currency.toLowerCase()]
			if (rate === undefined) continue
			const row = { baseCurrency: base, targetCurrency: currency, rate, provider, syncedAt: now, createdAt: now, updatedAt: now }
			const idx = rateRows.findIndex((r) => r.baseCurrency === base && r.targetCurrency === currency)
			if (idx >= 0) rateRows[idx] = { ...rateRows[idx], ...row }
			else rateRows.push(row)
			updated++
		}
		await saveRatesPayload({ rates: rateRows, syncMeta: { lastSyncAt: now, provider, status: 'success' } })
		return { success: true, provider, ratesUpdated: updated, syncedAt: now }
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		const existing = await getRatesPayload().catch(() => ({ rates: [], syncMeta: { lastSyncAt: null, provider: null, status: null } }))
		await saveRatesPayload({ ...existing, syncMeta: { lastSyncAt: now, provider: null, status: 'failed', error: message } }).catch(() => {})
		return { success: false, provider: null, ratesUpdated: 0, syncedAt: now, error: message }
	}
}

export async function getStoredRates(): Promise<CurrencyRate[]> {
	const data = await getRatesPayload()
	return data.rates.map((r) => ({
		baseCurrency: r.baseCurrency as CurrencyCode,
		targetCurrency: r.targetCurrency as CurrencyCode,
		rate: r.rate,
		provider: r.provider,
		syncedAt: r.syncedAt,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
	}))
}

export async function getSyncMeta(): Promise<{
	lastSyncAt: number | null
	provider: string | null
	status: string | null
}> {
	const data = await getRatesPayload()
	return {
		lastSyncAt: data.syncMeta.lastSyncAt ?? null,
		provider: data.syncMeta.provider ?? null,
		status: data.syncMeta.status ?? null,
	}
}

export async function getRateForCurrency(
	target: CurrencyCode,
	base: CurrencyCode = BASE_CURRENCY,
): Promise<CurrencyRate | null> {
	if (target === base) return null
	const data = await getRatesPayload()
	const row = data.rates.find((r) => r.baseCurrency === base && r.targetCurrency === target)
	if (!row) return null
	return {
		baseCurrency: row.baseCurrency as CurrencyCode,
		targetCurrency: row.targetCurrency as CurrencyCode,
		rate: row.rate,
		provider: row.provider,
		syncedAt: row.syncedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}
}

// Kept for compatibility (unused internally now).
export { rateDocId }
