import type { CurrencyCode } from '../../types/pricing'

const localeMap: Record<CurrencyCode, string> = {
	AED: 'ar-AE',
	USD: 'en-US',
	EGP: 'ar-EG',
	SAR: 'ar-SA',
	EUR: 'de-DE',
}

export function formatPrice(
	amount: number,
	currency: CurrencyCode,
	locale?: string,
): string {
	const resolvedLocale = locale ?? localeMap[currency] ?? 'en-US'
	return new Intl.NumberFormat(resolvedLocale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount)
}

export function formatRate(rate: number): string {
	return rate.toFixed(4)
}
