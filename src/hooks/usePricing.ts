import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
	CurrencyCode,
	ProductPrice,
	ProductWeightConfig,
	ResolvedPrice,
	WeightOption,
} from '../types/pricing'
import {
	buildManualPriceMap,
	buildRateMap,
	estimateConversion,
	resolveProductPrice,
} from '../lib/pricing/pricingEngine'
import { formatPrice } from '../lib/pricing/formatPrice'
import type { DisplayLang } from '../lib/pricing/formatPrice'
import { getStoredRates, getSyncMeta } from '../lib/pricing/currencyService'
import { getAllProductPrices } from '../lib/pricing/productPriceService'
import { resolveWeightedPrice } from '../lib/pricing/weightPricing'
import { getAllProductWeights } from '../lib/pricing/productWeightService'
import { useCurrencyStore } from '../store/currencyStore'
import { useCartStore } from '../store/cartStore'
import { useBaseCurrencyStore, getBaseCurrencySnapshot } from '../store/baseCurrencyStore'

export function useCurrencyRates() {
	const rates = useCurrencyStore((s) => s.rates)
	const ratesLoaded = useCurrencyStore((s) => s.ratesLoaded)
	const lastSyncAt = useCurrencyStore((s) => s.lastSyncAt)
	const setRates = useCurrencyStore((s) => s.setRates)
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)

	useEffect(() => {
		if (ratesLoaded) return
		let cancelled = false

		async function load() {
			try {
				const [stored, meta] = await Promise.all([
					getStoredRates(),
					getSyncMeta(),
				])
				if (!cancelled) {
					setRates(stored, meta.lastSyncAt)
				}
			} catch {
				if (!cancelled) setRates([], null)
			}
		}

		load()
		return () => { cancelled = true }
	}, [ratesLoaded, setRates])

	const rateMap = useMemo(() => buildRateMap(rates, baseCurrency), [rates, baseCurrency])

	return { rates, rateMap, lastSyncAt, ratesLoaded }
}

export function useProductPricesCache() {
	const [pricesByProduct, setPricesByProduct] = useState<
		Map<string, ProductPrice[]>
	>(new Map())
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const all = await getAllProductPrices()
				if (cancelled) return
				const map = new Map<string, ProductPrice[]>()
				for (const price of all) {
					const list = map.get(price.productId) ?? []
					list.push(price)
					map.set(price.productId, list)
				}
				setPricesByProduct(map)
			} finally {
				if (!cancelled) setLoaded(true)
			}
		}

		load()
		return () => { cancelled = true }
	}, [])

	return { pricesByProduct, loaded }
}

export function useProductWeightsCache() {
	const [weightsByProduct, setWeightsByProduct] = useState<
		Map<string, ProductWeightConfig>
	>(new Map())
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				const all = await getAllProductWeights()
				if (cancelled) return
				const map = new Map<string, ProductWeightConfig>()
				for (const config of all) map.set(config.productId, config)
				setWeightsByProduct(map)
			} finally {
				if (!cancelled) setLoaded(true)
			}
		}
		load()
		return () => { cancelled = true }
	}, [])

	return { weightsByProduct, loaded }
}

export function useResolvedPrice(
	productId: string,
	basePrice: number,
	currency?: CurrencyCode,
): ResolvedPrice {
	const selectedCurrency = useCurrencyStore((s) => s.currency)
	const targetCurrency = currency ?? selectedCurrency
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)
	const { rateMap } = useCurrencyRates()
	const { pricesByProduct } = useProductPricesCache()

	return useMemo(() => {
		const productPrices = pricesByProduct.get(productId) ?? []
		const manualPrices = buildManualPriceMap(productPrices)
		return resolveProductPrice({
			basePrice,
			baseCurrency,
			targetCurrency,
			manualPrices,
			rates: rateMap,
		})
	}, [productId, basePrice, baseCurrency, targetCurrency, pricesByProduct, rateMap])
}

export function useResolvedWeightPrice(
	productId: string,
	anchorBasePrice: number,
	weight: string,
	weightOverrides: Partial<Record<WeightOption, number>>,
): ResolvedPrice {
	const selectedCurrency = useCurrencyStore((s) => s.currency)
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)
	const { rateMap } = useCurrencyRates()
	const { pricesByProduct } = useProductPricesCache()

	return useMemo(() => {
		const productPrices = pricesByProduct.get(productId) ?? []
		const manualPrices = buildManualPriceMap(productPrices)
		return resolveWeightedPrice({
			anchorBasePrice,
			weight,
			weightOverrides,
			baseCurrency,
			targetCurrency: selectedCurrency,
			manualPrices,
			rates: rateMap,
		})
	}, [productId, anchorBasePrice, weight, weightOverrides, baseCurrency, selectedCurrency, pricesByProduct, rateMap])
}

/**
 * Formats a base-currency money amount (order total, revenue, totalSpent) in the
 * admin/visitor-selected currency. Converts at the current rate; if no rate is
 * available, falls back to showing the amount in the base currency.
 *
 * For pure money totals not tied to a single product (no manual overrides). For
 * product prices that should honor per-currency overrides, use `useResolvedPrice`.
 */
export function useAmountFormatter(): { format: (baseAmount: number) => string } {
	const selectedCurrency = useCurrencyStore((s) => s.currency)
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)
	const { rateMap } = useCurrencyRates()
	const { i18n } = useTranslation()
	const lang: DisplayLang = i18n.language === 'ar' ? 'ar' : 'en'

	return useMemo(() => {
		const format = (baseAmount: number): string => {
			const converted = estimateConversion(
				baseAmount,
				baseCurrency,
				selectedCurrency,
				rateMap[selectedCurrency],
			)
			if (converted === null) {
				return formatPrice(baseAmount, baseCurrency, lang)
			}
			return formatPrice(converted, selectedCurrency, lang)
		}
		return { format }
	}, [selectedCurrency, baseCurrency, rateMap, lang])
}

export function useRepriceCartOnCurrencyChange() {
	const currency = useCurrencyStore((s) => s.currency)
	const repriceAllItems = useCartStore((s) => s.repriceAllItems)
	const { rateMap, ratesLoaded } = useCurrencyRates()
	const { pricesByProduct, loaded: pricesLoaded } = useProductPricesCache()

	useEffect(() => {
		if (!ratesLoaded || !pricesLoaded) return
		if (useCartStore.getState().items.length === 0) return
		repriceAllItems(currency, pricesByProduct, rateMap)
	}, [
		currency,
		ratesLoaded,
		pricesLoaded,
		repriceAllItems,
		pricesByProduct,
		rateMap,
	])
}

export function resolvePriceForProduct(
	productId: string,
	basePrice: number,
	currency: CurrencyCode,
	pricesByProduct: Map<string, ProductPrice[]>,
	rateMap: Partial<Record<CurrencyCode, number>>,
): ResolvedPrice {
	const productPrices = pricesByProduct.get(productId) ?? []
	const manualPrices = buildManualPriceMap(productPrices)
	return resolveProductPrice({
		basePrice,
		baseCurrency: getBaseCurrencySnapshot(),
		targetCurrency: currency,
		manualPrices,
		rates: rateMap,
	})
}
