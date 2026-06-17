import { useTranslation } from 'react-i18next'
import { useCurrencyStore } from '../store/currencyStore'
import { useCurrencySettingsStore } from '../store/currencySettingsStore'
import type { CurrencyCode } from '../types/pricing'

interface CurrencySelectorProps {
	compact?: boolean
}

export default function CurrencySelector({ compact = false }: CurrencySelectorProps) {
	const { t } = useTranslation()
	const currency = useCurrencyStore((s) => s.currency)
	const setCurrency = useCurrencyStore((s) => s.setCurrency)
	const enabledCurrencies = useCurrencySettingsStore((s) => s.enabledCurrencies)

	return (
		<select
			value={currency}
			onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
			aria-label={t('select_currency')}
			title={t('select_currency')}
			style={{
				fontSize: compact ? '0.75rem' : '0.8rem',
				fontWeight: 700,
				letterSpacing: '0.06em',
				color: 'var(--th-text-variant)',
				background: 'transparent',
				border: '1px solid var(--th-outline)',
				borderRadius: '9999px',
				padding: compact ? '0.25rem 0.6rem' : '0.3rem 0.85rem',
				minHeight: compact ? '36px' : '44px',
				cursor: 'pointer',
				outline: 'none',
			}}
		>
			{enabledCurrencies.map((code) => (
				<option key={code} value={code}>
					{code}
				</option>
			))}
		</select>
	)
}
