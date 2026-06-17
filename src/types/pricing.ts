export type CurrencyCode = 'AED' | 'USD' | 'EGP' | 'SAR' | 'EUR'

export interface CurrencySettings {
	enabled: CurrencyCode[]
	default: CurrencyCode
}

export type PriceSource = 'manual' | 'converted'

export type ProductPricingType = 'per_kg' | 'fixed'

export type WeightOption = '500g' | '1kg' | '2kg' | '3kg'

export interface ProductPrice {
	productId: string
	currencyCode: CurrencyCode
	price: number
	isManual: boolean
	createdAt: number
	updatedAt: number
}

export interface CurrencyRate {
	baseCurrency: CurrencyCode
	targetCurrency: CurrencyCode
	rate: number
	provider: string
	syncedAt: number
	createdAt: number
	updatedAt: number
}

export interface ResolvedPrice {
	price: number
	currency: CurrencyCode
	source: PriceSource
	exchangeRate: number | null
	basePrice: number
	baseCurrency: CurrencyCode
	fallbackToBase?: boolean
}

export interface OrderPriceSnapshot {
	currency: CurrencyCode
	unitPrice: number
	totalPrice: number
	exchangeRateUsed: number | null
	priceSource: PriceSource
}
