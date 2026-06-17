import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrencyCode, CurrencyRate } from '../types/pricing'
import { BASE_CURRENCY, CURRENCY_LOCALE_MAP } from '../lib/pricing/constants'
import {
	reconcilePersistedCurrency,
	resolveInitialCurrency,
} from '../lib/pricing/currencyAvailability'
import { getCurrencySettingsSnapshot } from './currencySettingsStore'

const STORAGE_KEY = 'jamhawi-currency-storage'

interface CurrencyState {
	currency: CurrencyCode
	rates: CurrencyRate[]
	ratesLoaded: boolean
	lastSyncAt: number | null
	setCurrency: (currency: CurrencyCode) => void
	setRates: (rates: CurrencyRate[], lastSyncAt?: number | null) => void
	detectDefaultCurrency: () => CurrencyCode
}

function detectFromBrowser(): CurrencyCode {
	const lang = navigator.language
	if (CURRENCY_LOCALE_MAP[lang]) {
		return CURRENCY_LOCALE_MAP[lang]
	}
	const prefix = lang.split('-')[0]
	if (prefix === 'ar') return 'EGP'
	if (prefix === 'en') return 'AED'
	return BASE_CURRENCY
}

export const useCurrencyStore = create<CurrencyState>()(
	persist(
		(set) => ({
			currency: BASE_CURRENCY,
			rates: [],
			ratesLoaded: false,
			lastSyncAt: null,
			setCurrency: (currency) => {
				const { enabled } = getCurrencySettingsSnapshot()
				if (enabled.includes(currency)) {
					set({ currency })
				}
			},
			setRates: (rates, lastSyncAt = null) => {
				set({ rates, ratesLoaded: true, lastSyncAt })
			},
			detectDefaultCurrency: () =>
				resolveInitialCurrency(detectFromBrowser(), getCurrencySettingsSnapshot()),
		}),
		{
			name: STORAGE_KEY,
			partialize: (state) => ({ currency: state.currency }),
		},
	),
)

export function initCurrencyPreference(): void {
	const store = useCurrencyStore.getState()
	const stored = localStorage.getItem(STORAGE_KEY)
	if (!stored) {
		store.setCurrency(store.detectDefaultCurrency())
	}
}

/**
 * Called after currency settings load: if the persisted/active currency is no
 * longer enabled, move the visitor to the configured default.
 */
export function reconcileCurrencyWithSettings(): void {
	const { setCurrency, currency } = useCurrencyStore.getState()
	const next = reconcilePersistedCurrency(currency, getCurrencySettingsSnapshot())
	if (next !== currency) {
		// setCurrency validates against enabled; `next` is guaranteed enabled.
		setCurrency(next)
	}
}
