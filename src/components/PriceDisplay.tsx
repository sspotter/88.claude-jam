import { useTranslation } from 'react-i18next'
import type { ResolvedPrice } from '../types/pricing'
import { formatPrice } from '../lib/pricing/formatPrice'

interface PriceDisplayProps {
	resolved: ResolvedPrice
	showIndicator?: boolean
	size?: 'sm' | 'md' | 'lg'
	className?: string
}

export default function PriceDisplay({
	resolved,
	showIndicator = true,
	size = 'md',
	className = '',
}: PriceDisplayProps) {
	const { t } = useTranslation()

	const fontSize = size === 'lg' ? '1.5rem' : size === 'sm' ? '0.875rem' : '1rem'

	const indicatorKey = resolved.fallbackToAed
		? 'price_fallback_aed'
		: resolved.source === 'manual'
			? 'price_source_manual'
			: 'price_source_converted'

	return (
		<div className={className}>
			<span style={{ fontSize, fontWeight: 600, color: 'var(--th-gold)' }}>
				{formatPrice(resolved.price, resolved.currency)}
			</span>
			{showIndicator && (
				<p
					style={{
						margin: '0.25rem 0 0',
						fontSize: '0.75rem',
						color: 'var(--th-muted)',
					}}
				>
					{t(indicatorKey)}
					{resolved.source === 'converted' && !resolved.fallbackToAed && (
						<>
							{' '}
							({formatPrice(resolved.aedPrice, 'AED')})
						</>
					)}
				</p>
			)}
		</div>
	)
}
