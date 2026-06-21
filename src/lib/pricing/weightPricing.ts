import type {
	CurrencyCode,
	ProductPricingType,
	ResolvedPrice,
	WeightOption,
} from '../../types/pricing'
import { resolveProductPrice, roundPrice } from './pricingEngine'

export const WEIGHT_MULTIPLIERS: Record<WeightOption, number> = {
	'500g': 0.5,
	'1kg': 1,
	'2kg': 2,
	'5kg': 5,
}

export const WEIGHT_OPTIONS: WeightOption[] = [
	'500g',
	'1kg',
	'2kg',
	'5kg',
]

/** The weight whose price the admin sets directly; all others derive from it. */
export const ANCHOR_WEIGHT: WeightOption = '2kg'

/** Weights shown for a product that has no saved config. */
export const DEFAULT_VISIBLE_WEIGHTS: WeightOption[] = ['500g', '1kg', '2kg', '5kg']

export function getWeightMultiplier(weight: string): number {
	return WEIGHT_MULTIPLIERS[weight as WeightOption] ?? 1
}

export function calculateAedUnitPrice(
	pricePerKg: number,
	weight: string,
	pricingType: ProductPricingType,
): number {
	if (pricingType !== 'per_kg') {
		return pricePerKg
	}
	return roundPrice(pricePerKg * getWeightMultiplier(weight))
}

export function getCartLineId(
	productId: string,
	weight?: string,
): string {
	if (weight) {
		return `${productId}::${weight}`
	}
	return productId
}

/**
 * Base-currency price for a single weight. Uses the per-weight override when
 * present, otherwise derives linearly from the 2kg anchor: anchor × kg / 2.
 */
export function resolveWeightBasePrice(
	anchorBasePrice: number,
	weight: string,
	weightOverrides: Partial<Record<WeightOption, number>> = {},
): number {
	const override = weightOverrides[weight as WeightOption]
	if (override !== undefined && override !== null) {
		return roundPrice(override)
	}
	const kg = getWeightMultiplier(weight)
	return roundPrice((anchorBasePrice * kg) / 2)
}

export interface WeightedPriceInput {
	/** Product 2kg anchor price in the base currency. */
	anchorBasePrice: number
	weight: string
	weightOverrides?: Partial<Record<WeightOption, number>>
	baseCurrency: CurrencyCode
	targetCurrency: CurrencyCode
	/** Per-currency manual overrides, interpreted as the 2kg anchor in that currency. */
	manualPrices?: Partial<Record<CurrencyCode, number>>
	rates?: Partial<Record<CurrencyCode, number>>
}

/**
 * Customer-facing price for (product weight, currency).
 *
 * Layer 1: base-currency weight price = override-or-linear (resolveWeightBasePrice).
 * Layer 2 currency:
 *   - target == base            → the base weight price
 *   - per-currency override set  → §3.3: treat it as the 2kg anchor in that
 *                                  currency and scale linearly (override × kg/2)
 *   - else                       → convert the base weight price via rate
 *                                  (falls back to base amount if no rate)
 */
export function resolveWeightedPrice(input: WeightedPriceInput): ResolvedPrice {
	const {
		anchorBasePrice,
		weight,
		weightOverrides = {},
		baseCurrency,
		targetCurrency,
		manualPrices = {},
		rates = {},
	} = input

	const baseWeightPrice = resolveWeightBasePrice(anchorBasePrice, weight, weightOverrides)

	if (targetCurrency !== baseCurrency) {
		const anchorOverride = manualPrices[targetCurrency]
		if (anchorOverride !== undefined && anchorOverride !== null) {
			const kg = getWeightMultiplier(weight)
			return {
				price: roundPrice((anchorOverride * kg) / 2),
				currency: targetCurrency,
				source: 'manual',
				exchangeRate: null,
				basePrice: baseWeightPrice,
				baseCurrency,
			}
		}
	}

	// No per-currency anchor override: convert the base weight price via rate.
	return resolveProductPrice({
		basePrice: baseWeightPrice,
		baseCurrency,
		targetCurrency,
		manualPrices: {},
		rates,
	})
}
