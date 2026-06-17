import { apiFetch } from '../api/client'
import type { CurrencyCode, ProductPrice } from '../../types/pricing'
import { BASE_CURRENCY } from './constants'

interface PriceRow {
	productId: string
	currencyCode: string
	price: number
	isManual: boolean
	createdAt: number
	updatedAt: number
}

function mapRow(data: PriceRow): ProductPrice {
	return {
		productId: data.productId,
		currencyCode: data.currencyCode as CurrencyCode,
		price: data.price,
		isManual: data.isManual,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
	}
}

async function getAllRows(): Promise<PriceRow[]> {
	const res = await apiFetch<{ prices: PriceRow[] }>('/api/pricing/product-prices')
	return res.prices
}

async function saveRows(rows: PriceRow[]): Promise<void> {
	await apiFetch('/api/admin/pricing/product-prices', {
		method: 'PUT',
		auth: true,
		body: JSON.stringify({ prices: rows }),
	})
}

export async function getProductPrices(
	productId: string,
): Promise<ProductPrice[]> {
	const res = await apiFetch<{ prices: PriceRow[] }>(
		`/api/pricing/product-prices?productId=${encodeURIComponent(productId)}`,
	)
	return res.prices.map(mapRow)
}

export async function getAllProductPrices(): Promise<ProductPrice[]> {
	const rows = await getAllRows()
	return rows.map(mapRow)
}

export async function saveProductPrice(
	productId: string,
	currency: CurrencyCode,
	price: number,
	isManual: boolean,
): Promise<void> {
	const now = Date.now()
	const row: PriceRow = {
		productId,
		currencyCode: currency,
		price,
		isManual,
		createdAt: now,
		updatedAt: now,
	}
	await saveRows([row])
}

export async function removeProductPrice(
	productId: string,
	currency: CurrencyCode,
): Promise<void> {
	await apiFetch('/api/admin/pricing/product-prices', {
		method: 'DELETE',
		auth: true,
		body: JSON.stringify({ productId, currencyCode: currency }),
	})
}

export async function saveProductPricing(
	productId: string,
	basePrice: number,
	manualPrices: Partial<Record<CurrencyCode, number | null>>,
): Promise<void> {
	if (basePrice < 0 || Number.isNaN(basePrice)) {
		throw new Error('Base price is required.')
	}

	await saveProductPrice(productId, BASE_CURRENCY, basePrice, true)

	for (const [currency, price] of Object.entries(manualPrices)) {
		const code = currency as CurrencyCode
		if (code === BASE_CURRENCY) continue

		if (price === null || price === undefined) {
			try {
				await removeProductPrice(productId, code)
			} catch {
				// Row may not exist
			}
			continue
		}

		const numericPrice = Number(price)
		if (Number.isNaN(numericPrice) || numericPrice < 0) continue
		await saveProductPrice(productId, code, numericPrice, true)
	}
}

export function groupPricesByProduct(
	prices: ProductPrice[],
): Map<string, ProductPrice[]> {
	const map = new Map<string, ProductPrice[]>()
	for (const price of prices) {
		const existing = map.get(price.productId) ?? []
		existing.push(price)
		map.set(price.productId, existing)
	}
	return map
}
