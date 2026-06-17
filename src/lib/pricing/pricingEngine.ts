import type {
	CurrencyCode,
	CurrencyRate,
	PriceSource,
	ProductPrice,
	ResolvedPrice,
} from '../../types/pricing'
import { BASE_CURRENCY } from './constants'

export interface PricingInput {
	aedPrice: number
	targetCurrency: CurrencyCode
	manualPrices?: Partial<Record<CurrencyCode, number>>
	rates?: Partial<Record<CurrencyCode, number>>
}

export function resolveProductPrice(input: PricingInput): ResolvedPrice {
	const { aedPrice, targetCurrency, manualPrices = {}, rates = {} } = input

	if (targetCurrency === BASE_CURRENCY) {
		return {
			price: aedPrice,
			currency: BASE_CURRENCY,
			source: 'manual',
			exchangeRate: null,
			aedPrice,
		}
	}

	const manualPrice = manualPrices[targetCurrency]
	if (manualPrice !== undefined && manualPrice !== null) {
		return {
			price: manualPrice,
			currency: targetCurrency,
			source: 'manual',
			exchangeRate: null,
			aedPrice,
		}
	}

	const rate = rates[targetCurrency]
	if (rate === undefined || rate === null) {
		return {
			price: aedPrice,
			currency: BASE_CURRENCY,
			source: 'manual',
			exchangeRate: null,
			aedPrice,
			fallbackToAed: true,
		}
	}

	const converted = roundPrice(aedPrice * rate)
	return {
		price: converted,
		currency: targetCurrency,
		source: 'converted',
		exchangeRate: rate,
		aedPrice,
	}
}

export function buildManualPriceMap(
	productPrices: ProductPrice[],
): Partial<Record<CurrencyCode, number>> {
	const map: Partial<Record<CurrencyCode, number>> = {}
	for (const entry of productPrices) {
		if (entry.isManual) {
			map[entry.currencyCode] = entry.price
		}
	}
	return map
}

export function buildRateMap(
	rates: CurrencyRate[],
): Partial<Record<CurrencyCode, number>> {
	const map: Partial<Record<CurrencyCode, number>> = {}
	for (const entry of rates) {
		if (entry.baseCurrency === BASE_CURRENCY) {
			map[entry.targetCurrency] = entry.rate
		}
	}
	return map
}

export function estimateConversion(
	aedPrice: number,
	currency: CurrencyCode,
	rate: number | undefined,
): number | null {
	if (currency === BASE_CURRENCY) return aedPrice
	if (rate === undefined) return null
	return roundPrice(aedPrice * rate)
}

export function roundPrice(value: number): number {
	return Math.round(value * 100) / 100
}

export function getPriceSourceLabel(
	source: PriceSource,
	fallbackToAed?: boolean,
): 'manual' | 'converted' | 'fallback' {
	if (fallbackToAed) return 'fallback'
	return source
}
