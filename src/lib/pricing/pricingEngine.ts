import type {
	CurrencyCode,
	CurrencyRate,
	PriceSource,
	ProductPrice,
	ResolvedPrice,
} from '../../types/pricing'

export interface PricingInput {
	basePrice: number
	baseCurrency: CurrencyCode
	targetCurrency: CurrencyCode
	manualPrices?: Partial<Record<CurrencyCode, number>>
	rates?: Partial<Record<CurrencyCode, number>>
}

export function resolveProductPrice(input: PricingInput): ResolvedPrice {
	const { basePrice, baseCurrency, targetCurrency, manualPrices = {}, rates = {} } = input

	if (targetCurrency === baseCurrency) {
		return { price: basePrice, currency: baseCurrency, source: 'manual', exchangeRate: null, basePrice, baseCurrency }
	}

	const manualPrice = manualPrices[targetCurrency]
	if (manualPrice !== undefined && manualPrice !== null) {
		return { price: manualPrice, currency: targetCurrency, source: 'manual', exchangeRate: null, basePrice, baseCurrency }
	}

	const rate = rates[targetCurrency]
	if (rate === undefined || rate === null) {
		return { price: basePrice, currency: baseCurrency, source: 'manual', exchangeRate: null, basePrice, baseCurrency, fallbackToBase: true }
	}

	const converted = roundPrice(basePrice * rate)
	return { price: converted, currency: targetCurrency, source: 'converted', exchangeRate: rate, basePrice, baseCurrency }
}

export function buildManualPriceMap(
	productPrices: ProductPrice[],
): Partial<Record<CurrencyCode, number>> {
	const map: Partial<Record<CurrencyCode, number>> = {}
	for (const entry of productPrices) {
		if (entry.isManual) map[entry.currencyCode] = entry.price
	}
	return map
}

export function buildRateMap(
	rates: CurrencyRate[],
	baseCurrency: CurrencyCode,
): Partial<Record<CurrencyCode, number>> {
	const map: Partial<Record<CurrencyCode, number>> = {}
	for (const entry of rates) {
		if (entry.baseCurrency === baseCurrency) map[entry.targetCurrency] = entry.rate
	}
	return map
}

export function estimateConversion(
	basePrice: number,
	baseCurrency: CurrencyCode,
	currency: CurrencyCode,
	rate: number | undefined,
): number | null {
	if (currency === baseCurrency) return basePrice
	if (rate === undefined) return null
	return roundPrice(basePrice * rate)
}

export function roundPrice(value: number): number {
	return Math.round(value * 100) / 100
}

export function getPriceSourceLabel(
	source: PriceSource,
	fallbackToBase?: boolean,
): 'manual' | 'converted' | 'fallback' {
	if (fallbackToBase) return 'fallback'
	return source
}
