import type {
	CurrencyCode,
	ProductPrice,
	ProductPricingType,
	ResolvedPrice,
} from '../../types/pricing'
import type { CartItem } from '../../store/cartStore'
import { buildManualPriceMap, resolveProductPrice } from './pricingEngine'
import { getCartLineId } from './weightPricing'

export interface BuildCartItemOptions {
	pricingType?: ProductPricingType
	weight?: string
	pricePerKg?: number
}

export function getListCartOptions(product: {
	price: number
	pricingType?: ProductPricingType
}): BuildCartItemOptions {
	const pricingType = product.pricingType ?? 'fixed'
	if (pricingType !== 'per_kg') {
		return { pricingType }
	}
	return {
		pricingType,
		weight: '1kg',
		pricePerKg: product.price,
	}
}

export function buildCartItem(
	productId: string,
	name: string,
	image: string | undefined,
	resolved: ResolvedPrice,
	options: BuildCartItemOptions = {},
): Omit<CartItem, 'quantity'> {
	const pricingType = options.pricingType ?? 'fixed'
	const weight = options.weight
	const pricePerKg =
		pricingType === 'per_kg' ? options.pricePerKg : undefined

	return {
		cartLineId: getCartLineId(productId, weight),
		productId,
		name,
		price: resolved.price,
		image,
		currency: resolved.currency,
		priceSource: resolved.source,
		exchangeRateUsed: resolved.exchangeRate,
		aedPrice: resolved.aedPrice,
		weight,
		pricePerKg,
		pricingType,
	}
}

export function repriceCartItem(
	item: CartItem,
	currency: CurrencyCode,
	pricesByProduct: Map<string, ProductPrice[]>,
	rateMap: Partial<Record<CurrencyCode, number>>,
): CartItem {
	const aedPrice = item.aedPrice ?? item.price
	const productPrices = pricesByProduct.get(item.productId) ?? []
	const resolved = resolveProductPrice({
		aedPrice,
		targetCurrency: currency,
		manualPrices: buildManualPriceMap(productPrices),
		rates: rateMap,
	})

	return {
		...item,
		price: resolved.price,
		currency: resolved.currency,
		priceSource: resolved.source,
		exchangeRateUsed: resolved.exchangeRate,
		aedPrice: resolved.aedPrice,
	}
}
