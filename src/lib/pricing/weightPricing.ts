import type { ProductPricingType, WeightOption } from '../../types/pricing'
import { roundPrice } from './pricingEngine'

export const WEIGHT_MULTIPLIERS: Record<WeightOption, number> = {
	'500g': 0.5,
	'1kg': 1,
	'2kg': 2,
	'3kg': 3,
}

export const WEIGHT_OPTIONS: WeightOption[] = [
	'500g',
	'1kg',
	'2kg',
	'3kg',
]

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
