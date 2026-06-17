import { useTranslation } from 'react-i18next'
import { useResolvedPrice } from '../hooks/usePricing'
import { formatPrice } from '../lib/pricing/formatPrice'

interface ProductListPriceProps {
	productId: string
	basePrice: number
}

export default function ProductListPrice({
	productId,
	basePrice,
}: ProductListPriceProps) {
	const { i18n } = useTranslation()
	const lang = i18n.language === 'ar' ? 'ar' : 'en'
	const resolved = useResolvedPrice(productId, basePrice)
	return (
		<span style={{ color: 'var(--th-gold)', fontWeight: 600 }}>
			{formatPrice(resolved.price, resolved.currency, lang)}
		</span>
	)
}
