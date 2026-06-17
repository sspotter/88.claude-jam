import { useEffect, useMemo, useState } from 'react'
import type { CurrencyCode, ProductPrice, ResolvedPrice } from '../types/pricing'
import {
	buildManualPriceMap,
	buildRateMap,
	resolveProductPrice,
} from '../lib/pricing/pricingEngine'
import { getStoredRates, getSyncMeta } from '../lib/pricing/currencyService'
import { getAllProductPrices } from '../lib/pricing/productPriceService'
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
