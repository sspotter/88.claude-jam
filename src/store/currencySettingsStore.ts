import { create } from 'zustand'
import type { CurrencyCode, CurrencySettings } from '../types/pricing'
import { getCurrencySettings } from '../lib/api/catalog'
import {
	DEFAULT_CURRENCY_SETTINGS,
	sanitizeCurrencySettings,
} from '../lib/pricing/currencyAvailability'

interface CurrencySettingsState {
	enabledCurrencies: CurrencyCode[]
	defaultCurrency: CurrencyCode
	loaded: boolean
	setSettings: (settings: CurrencySettings) => void
	load: () => Promise<void>
}

export const useCurrencySettingsStore = create<CurrencySettingsState>()((set) => ({
	enabledCurrencies: [...DEFAULT_CURRENCY_SETTINGS.enabled],
	defaultCurrency: DEFAULT_CURRENCY_SETTINGS.default,
	loaded: false,
	setSettings: (settings) => {
		const clean = sanitizeCurrencySettings(settings)
		set({
			enabledCurrencies: clean.enabled,
			defaultCurrency: clean.default,
			loaded: true,
		})
	},
	load: async () => {
		try {
			const settings = await getCurrencySettings()
			const clean = sanitizeCurrencySettings(settings)
			set({
				enabledCurrencies: clean.enabled,
				defaultCurrency: clean.default,
				loaded: true,
			})
		} catch {
			// Fail open: keep master-list defaults so the storefront stays usable.
			set({ loaded: true })
		}
	},
}))

/** Snapshot helpers for non-React modules (e.g. currencyStore). */
export function getCurrencySettingsSnapshot(): {
	enabled: CurrencyCode[]
	default: CurrencyCode
} {
	const s = useCurrencySettingsStore.getState()
	return { enabled: s.enabledCurrencies, default: s.defaultCurrency }
}
