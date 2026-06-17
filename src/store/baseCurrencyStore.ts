import { create } from 'zustand'
import type { CurrencyCode } from '../types/pricing'
import { BASE_CURRENCY } from '../lib/pricing/constants'
import { apiFetch } from '../lib/api/client'

interface BaseCurrencyState {
	baseCurrency: CurrencyCode
	loaded: boolean
}

export const useBaseCurrencyStore = create<BaseCurrencyState>()(() => ({
	baseCurrency: BASE_CURRENCY,
	loaded: false,
}))

export function getBaseCurrencySnapshot(): CurrencyCode {
	return useBaseCurrencyStore.getState().baseCurrency
}

export async function loadBaseCurrency(): Promise<void> {
	try {
		const { base } = await apiFetch<{ base: CurrencyCode }>('/api/settings/base-currency')
		useBaseCurrencyStore.setState({ baseCurrency: base, loaded: true })
	} catch {
		useBaseCurrencyStore.setState({ loaded: true })
	}
}

export async function saveBaseCurrency(base: CurrencyCode): Promise<void> {
	await apiFetch('/api/admin/settings/base-currency', {
		method: 'PUT',
		auth: true,
		body: JSON.stringify({ base }),
	})
	useBaseCurrencyStore.setState({ baseCurrency: base })
}
