import type { CurrencyCode } from '../../types/pricing'

export const BASE_CURRENCY: CurrencyCode = 'AED'

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
	'AED',
	'USD',
	'EGP',
	'SAR',
	'EUR',
]

export const OPTIONAL_CURRENCIES: CurrencyCode[] = SUPPORTED_CURRENCIES.filter(
	(c) => c !== BASE_CURRENCY,
)

export const CURRENCY_API_PRIMARY =
	'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aed.json'

export const CURRENCY_API_FALLBACK =
	'https://latest.currency-api.pages.dev/v1/currencies/aed.json'

export const RATE_STALE_MS = 24 * 60 * 60 * 1000

export const CURRENCY_LOCALE_MAP: Record<string, CurrencyCode> = {
	ar: 'EGP',
	'en-AE': 'AED',
	'en-US': 'USD',
	'en-GB': 'EUR',
	'en-SA': 'SAR',
	'en-EG': 'EGP',
}

export const CURRENCY_LABELS: Record<CurrencyCode, { en: string; ar: string }> = {
	AED: { en: 'AED', ar: 'د.إ' },
	USD: { en: 'USD', ar: '$' },
	EGP: { en: 'EGP', ar: 'ج م' },
	SAR: { en: 'SAR', ar: 'ر.س' },
	EUR: { en: 'EUR', ar: '€' },
}
