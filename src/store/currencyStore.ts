import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrencyCode, CurrencyRate } from '../types/pricing'
import {
	BASE_CURRENCY,
	CURRENCY_LOCALE_MAP,
	SUPPORTED_CURRENCIES,
} from '../lib/pricing/constants'

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
		(set, get) => ({
			currency: BASE_CURRENCY,
			rates: [],
			ratesLoaded: false,
			lastSyncAt: null,
			setCurrency: (currency) => {
				if (SUPPORTED_CURRENCIES.includes(currency)) {
					set({ currency })
				}
			},
			setRates: (rates, lastSyncAt = null) => {
				set({ rates, ratesLoaded: true, lastSyncAt })
			},
			detectDefaultCurrency: () => detectFromBrowser(),
		}),
		{
			name: 'jamhawi-currency-storage',
			partialize: (state) => ({ currency: state.currency }),
			onRehydrateStorage: () => (state) => {
				if (state && !SUPPORTED_CURRENCIES.includes(state.currency)) {
					state.currency = detectFromBrowser()
				}
			},
		},
	),
)

export function initCurrencyPreference(): void {
	const store = useCurrencyStore.getState()
	const stored = localStorage.getItem('jamhawi-currency-storage')
	if (!stored) {
		store.setCurrency(store.detectDefaultCurrency())
	}
}
