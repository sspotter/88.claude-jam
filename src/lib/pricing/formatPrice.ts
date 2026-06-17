import type { CurrencyCode } from '../../types/pricing'
import { CURRENCY_LABELS } from './constants'

export type DisplayLang = 'en' | 'ar'

export function formatPrice(
	amount: number,
	currency: CurrencyCode,
	lang: DisplayLang = 'en',
): string {
	const num = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount)
	const label = CURRENCY_LABELS[currency]?.[lang] ?? currency
	return `${num} ${label}`
}

export function formatRate(rate: number): string {
	return rate.toFixed(4)
}
