import { apiFetch } from '../api/client'
import type { ProductWeightConfig, WeightOption } from '../../types/pricing'
import { DEFAULT_VISIBLE_WEIGHTS } from './weightPricing'

interface ConfigRow {
	productId: string
	visibleWeights: WeightOption[]
	weightOverrides: Partial<Record<WeightOption, number>>
}

function mapRow(row: ConfigRow): ProductWeightConfig {
	return {
		productId: row.productId,
		visibleWeights:
			Array.isArray(row.visibleWeights) && row.visibleWeights.length > 0
				? row.visibleWeights
				: [...DEFAULT_VISIBLE_WEIGHTS],
		weightOverrides: row.weightOverrides ?? {},
	}
}

export async function getAllProductWeights(): Promise<ProductWeightConfig[]> {
	const res = await apiFetch<{ configs: ConfigRow[] }>(
		'/api/pricing/product-weights',
	)
	return res.configs.map(mapRow)
}

export async function getProductWeights(
	productId: string,
): Promise<ProductWeightConfig | null> {
	const res = await apiFetch<{ configs: ConfigRow[] }>(
		`/api/pricing/product-weights?productId=${encodeURIComponent(productId)}`,
	)
	const row = res.configs.find((c) => c.productId === productId)
	return row ? mapRow(row) : null
}

export async function saveProductWeights(
	config: ProductWeightConfig,
): Promise<void> {
	await apiFetch('/api/admin/pricing/product-weights', {
		method: 'PUT',
		auth: true,
		body: JSON.stringify({ config }),
	})
}
