import { useTranslation } from 'react-i18next'
import { useResolvedPrice } from '../hooks/usePricing'
import { formatPrice } from '../lib/pricing/formatPrice'
import type { DisplayLang } from '../lib/pricing/formatPrice'

interface ProductPriceCellProps {
	productId: string
	basePrice: number
}

/**
 * Renders a product's price in the selected currency, honoring per-currency
 * manual overrides + rate + base-fallback (the real customer-facing price).
 *
 * Isolates the per-row `useResolvedPrice` hook call so it isn't invoked in a
 * loop in the parent. Shared by admin Products and Inventory tables.
 */
export default function ProductPriceCell({ productId, basePrice }: ProductPriceCellProps) {
	const { i18n } = useTranslation()
	const lang: DisplayLang = i18n.language === 'ar' ? 'ar' : 'en'
	const resolved = useResolvedPrice(productId, basePrice)
	return <>{formatPrice(resolved.price, resolved.currency, lang)}</>
}
