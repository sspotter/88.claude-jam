import { useTranslation } from 'react-i18next'
import type { CartItem } from '../store/cartStore'
import type { CurrencyCode } from '../types/pricing'
import { formatPrice } from '../lib/pricing/formatPrice'

interface CartPriceLabelProps {
	item: CartItem
	amount?: number
	showSource?: boolean
}

function getItemCurrency(item: CartItem): CurrencyCode {
	return item.currency ?? 'AED'
}

function getSourceKey(item: CartItem): string {
	if (item.priceSource === 'converted') return 'price_source_converted'
	return 'price_source_manual'
}

export default function CartPriceLabel({
	item,
	amount,
	showSource = false,
}: CartPriceLabelProps) {
	const { t } = useTranslation()
	const currency = getItemCurrency(item)
	const value = amount ?? item.price

	return (
		<span>
			{formatPrice(value, currency)}
			{showSource && item.priceSource && (
				<span
					style={{
						display: 'block',
						fontSize: '0.7rem',
						color: 'var(--th-muted)',
						marginTop: '0.15rem',
					}}
				>
					{t(getSourceKey(item))}
				</span>
			)}
		</span>
	)
}

export function getCartDisplayCurrency(items: CartItem[]): CurrencyCode {
	return items[0]?.currency ?? 'AED'
}
