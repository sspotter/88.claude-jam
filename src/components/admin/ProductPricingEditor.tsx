import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import type { CurrencyCode, WeightOption } from '../../types/pricing'
import {
	WEIGHT_OPTIONS,
	ANCHOR_WEIGHT,
	DEFAULT_VISIBLE_WEIGHTS,
	resolveWeightBasePrice,
} from '../../lib/pricing/weightPricing'
import {
	getProductWeights,
	saveProductWeights,
} from '../../lib/pricing/productWeightService'
import { BASE_CURRENCY, OPTIONAL_CURRENCIES } from '../../lib/pricing/constants'
import { formatPrice } from '../../lib/pricing/formatPrice'
import { estimateConversion } from '../../lib/pricing/pricingEngine'
import {
	getProductPrices,
	saveProductPricing,
} from '../../lib/pricing/productPriceService'
import { updateProduct } from '../../lib/api/admin'
import { useCurrencyRates } from '../../hooks/usePricing'
import { useBaseCurrencyStore } from '../../store/baseCurrencyStore'
import { handleApiError, OperationType } from '../../lib/api/errors'

type ManualPriceForm = Partial<Record<CurrencyCode, string>>

interface ProductPricingEditorProps {
	productId: string
	productBasePrice: number
	showBasePrice?: boolean
	onSaved?: () => void
}

export default function ProductPricingEditor({
	productId,
	productBasePrice,
	showBasePrice = true,
	onSaved,
}: ProductPricingEditorProps) {
	const { t } = useTranslation()
	const { rateMap } = useCurrencyRates()
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)

	const [basePrice, setBasePrice] = useState('')
	const [manualPrices, setManualPrices] = useState<ManualPriceForm>({})
	const [savedManual, setSavedManual] = useState<Set<CurrencyCode>>(new Set())
	const [loadingProduct, setLoadingProduct] = useState(false)
	const [saving, setSaving] = useState(false)
	const [visibleWeights, setVisibleWeights] = useState<Set<WeightOption>>(
		new Set(DEFAULT_VISIBLE_WEIGHTS),
	)
	const [weightOverrides, setWeightOverrides] = useState<
		Partial<Record<WeightOption, string>>
	>({})

	useEffect(() => {
		if (!productId) return
		loadProductPricing(productId)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [productId])

	async function loadProductPricing(id: string) {
		setLoadingProduct(true)
		try {
			const prices = await getProductPrices(id)
			const baseEntry = prices.find((p) => p.currencyCode === BASE_CURRENCY)
			const base = baseEntry?.price ?? productBasePrice ?? 0
			setBasePrice(String(base))

			const manual: ManualPriceForm = {}
			const saved = new Set<CurrencyCode>()
			for (const code of OPTIONAL_CURRENCIES) {
				const entry = prices.find((p) => p.currencyCode === code && p.isManual)
				if (entry) {
					manual[code] = String(entry.price)
					saved.add(code)
				} else {
					manual[code] = ''
				}
			}
			const weightConfig = await getProductWeights(id)
			if (weightConfig) {
				setVisibleWeights(new Set(weightConfig.visibleWeights))
				const overrides: Partial<Record<WeightOption, string>> = {}
				for (const w of WEIGHT_OPTIONS) {
					const v = weightConfig.weightOverrides[w]
					overrides[w] = v !== undefined && v !== null ? String(v) : ''
				}
				setWeightOverrides(overrides)
			} else {
				setVisibleWeights(new Set(DEFAULT_VISIBLE_WEIGHTS))
				setWeightOverrides({})
			}
			setManualPrices(manual)
			setSavedManual(saved)
		} catch (e) {
			handleApiError(e, OperationType.GET, 'product_prices')
		} finally {
			setLoadingProduct(false)
		}
	}

	async function handleSave() {
		const base = showBasePrice ? parseFloat(basePrice) : productBasePrice
		if (showBasePrice && basePrice.trim() === '') {
			toast.error(t('aed_price_required'))
			return
		}
		if (Number.isNaN(base) || base < 0) {
			toast.error(t('aed_price_required'))
			return
		}

		const parsedManual: Partial<Record<CurrencyCode, number | null>> = {}
		for (const code of OPTIONAL_CURRENCIES) {
			const raw = manualPrices[code]?.trim()
			if (!raw) {
				parsedManual[code] = null
				continue
			}
			const val = parseFloat(raw)
			if (val === 0) {
				const confirmed = window.confirm(t('confirm_zero_price'))
				if (!confirmed) return
			}
			parsedManual[code] = val
		}

		setSaving(true)
		try {
			await saveProductPricing(productId, base, parsedManual)
			if (visibleWeights.size === 0) {
				toast.error(t('at_least_one_weight'))
				setSaving(false)
				return
			}
			const overridesOut: Partial<Record<WeightOption, number>> = {}
			for (const w of WEIGHT_OPTIONS) {
				if (w === ANCHOR_WEIGHT) continue // anchor is the base price, not an override
				const raw = weightOverrides[w]?.trim()
				if (!raw) continue
				const val = parseFloat(raw)
				if (!Number.isNaN(val) && val >= 0) overridesOut[w] = val
			}
			await saveProductWeights({
				productId,
				visibleWeights: WEIGHT_OPTIONS.filter((w) => visibleWeights.has(w)),
				weightOverrides: overridesOut,
			})
			if (showBasePrice) {
				await updateProduct(productId, { price: base })
			}
			toast.success(t('save') + '!')
			await loadProductPricing(productId)
			onSaved?.()
		} catch (e) {
			const msg = e instanceof Error ? e.message : t('save_failed')
			toast.error(msg)
		} finally {
			setSaving(false)
		}
	}

	const baseNumeric = showBasePrice
		? parseFloat(basePrice) || 0
		: productBasePrice || 0

	function toggleWeightVisible(w: WeightOption) {
		setVisibleWeights((prev) => {
			const next = new Set(prev)
			if (next.has(w)) {
				if (next.size === 1) return prev // never empty
				next.delete(w)
			} else {
				next.add(w)
			}
			return next
		})
	}

	function autoWeightPrice(w: WeightOption): number {
		return resolveWeightBasePrice(baseNumeric, w, {})
	}

	if (loadingProduct) {
		return <p className="text-gray-400 text-sm">{t('loading')}...</p>
	}

	return (
		<div className="space-y-4">
			{showBasePrice && (
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{`${baseCurrency} ${t('price')}`} *
					</label>
					<input
						type="number"
						min="0"
						step="0.01"
						value={basePrice}
						onChange={(e) => setBasePrice(e.target.value)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
						required
					/>
				</div>
			)}

			<div className="border-t border-gray-100 pt-4">
				<label className="block text-sm font-medium text-gray-700 mb-1">
					{t('weights')}
				</label>
				<p className="text-xs text-gray-500 mb-3">{t('weights_desc')}</p>
				<div className="space-y-2">
					{WEIGHT_OPTIONS.map((w) => {
						const isAnchor = w === ANCHOR_WEIGHT
						const checked = visibleWeights.has(w)
						return (
							<div key={w} className="flex items-center gap-3">
								<input
									type="checkbox"
									checked={checked}
									onChange={() => toggleWeightVisible(w)}
									className="w-4 h-4"
									aria-label={`${t('show')} ${w}`}
								/>
								<span className="w-12 text-sm font-medium text-gray-700">{w}</span>
								{isAnchor ? (
									<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
										{t('anchor_weight_badge')}
									</span>
								) : (
									<input
										type="number"
										min="0"
										step="0.01"
										value={weightOverrides[w] ?? ''}
										onChange={(e) =>
											setWeightOverrides((prev) => ({ ...prev, [w]: e.target.value }))
										}
										placeholder={`${autoWeightPrice(w)} (${t('price_badge_auto')})`}
										className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
									/>
								)}
							</div>
						)
					})}
				</div>
			</div>

			<p className="text-xs text-gray-500">{t('leave_empty_convert')}</p>

			{OPTIONAL_CURRENCIES.map((code) => {
				const hasManual =
					savedManual.has(code) && manualPrices[code]?.trim() !== ''
				const estimated = estimateConversion(
					baseNumeric,
					BASE_CURRENCY,
					code,
					rateMap[code],
				)

				return (
					<div key={code}>
						<div className="flex items-center gap-2 mb-1">
							<label className="text-sm font-medium text-gray-700">
								{code} {t('price')} ({t('optional')})
							</label>
							<span
								className={`text-xs px-2 py-0.5 rounded-full ${
									hasManual
										? 'bg-blue-100 text-blue-700'
										: 'bg-gray-100 text-gray-600'
								}`}
							>
								{hasManual ? t('price_badge_manual') : t('price_badge_auto')}
							</span>
						</div>
						<input
							type="number"
							min="0"
							step="0.01"
							value={manualPrices[code] ?? ''}
							onChange={(e) =>
								setManualPrices((prev) => ({ ...prev, [code]: e.target.value }))
							}
							placeholder={t('leave_empty_convert')}
							className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
						/>
						{!manualPrices[code]?.trim() && (
							<p className="text-xs text-gray-500 mt-1">
								{t('estimated_price')}:{' '}
								{estimated !== null
									? formatPrice(estimated, code)
									: t('rate_unavailable')}
							</p>
						)}
					</div>
				)
			})}

			<button
				onClick={handleSave}
				disabled={saving}
				className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
			>
				<Save className="w-4 h-4" />
				{saving ? t('saving') : t('save')}
			</button>
		</div>
	)
}
