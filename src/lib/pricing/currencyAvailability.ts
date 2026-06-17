import type { CurrencyCode, CurrencySettings } from '../../types/pricing'
import { BASE_CURRENCY, SUPPORTED_CURRENCIES } from './constants'

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
	enabled: [...SUPPORTED_CURRENCIES],
	default: BASE_CURRENCY,
}

/**
 * Defensive client-side normalization: keep only master-list currencies in
 * master order, ensure a non-empty enabled set, and ensure `default` is enabled.
 * Falls back to DEFAULT_CURRENCY_SETTINGS when the input is unusable.
 */
export function sanitizeCurrencySettings(
	raw: Partial<CurrencySettings> | null | undefined,
): CurrencySettings {
	const rawEnabled = Array.isArray(raw?.enabled) ? raw!.enabled : []
	const enabled = SUPPORTED_CURRENCIES.filter((c) => rawEnabled.includes(c))

	if (enabled.length === 0) {
		return { enabled: [...DEFAULT_CURRENCY_SETTINGS.enabled], default: DEFAULT_CURRENCY_SETTINGS.default }
	}

	const def = raw?.default && enabled.includes(raw.default) ? raw.default : enabled[0]
	return { enabled, default: def }
}

/** Pick the currency a brand-new visitor should see. */
export function resolveInitialCurrency(
	detected: CurrencyCode,
	settings: { enabled: readonly CurrencyCode[]; default: CurrencyCode },
): CurrencyCode {
	return settings.enabled.includes(detected) ? detected : settings.default
}

/** Keep a persisted choice if still enabled, otherwise fall back to default. */
export function reconcilePersistedCurrency(
	current: CurrencyCode,
	settings: { enabled: readonly CurrencyCode[]; default: CurrencyCode },
): CurrencyCode {
	return settings.enabled.includes(current) ? current : settings.default
}
