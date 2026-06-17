import { useResolvedPrice } from '../hooks/usePricing'
import { formatPrice } from '../lib/pricing/formatPrice'

interface ProductListPriceProps {
	productId: string
	aedPrice: number
}

export default function ProductListPrice({
	productId,
	aedPrice,
}: ProductListPriceProps) {
	const resolved = useResolvedPrice(productId, aedPrice)
	return (
		<span style={{ color: 'var(--th-gold)', fontWeight: 600 }}>
			{formatPrice(resolved.price, resolved.currency)}
		</span>
	)
}
