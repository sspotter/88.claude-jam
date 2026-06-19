import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	RefreshCw,
	Save,
	AlertTriangle,
	CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CurrencyCode, CurrencySettings } from '../../types/pricing'
import {
	BASE_CURRENCY,
	RATE_STALE_MS,
	SUPPORTED_CURRENCIES,
} from '../../lib/pricing/constants'
import { formatPrice, formatRate } from '../../lib/pricing/formatPrice'
import {
	getStoredRates,
	getSyncMeta,
	syncExchangeRates,
} from '../../lib/pricing/currencyService'
import { getCurrencySettings } from '../../lib/api/catalog'
import { listProducts, listCategories, updateCurrencySettings } from '../../lib/api/admin'
import type { Product as ApiProduct, Category as ApiCategory } from '../../lib/api/catalog'
import { useCurrencySettingsStore } from '../../store/currencySettingsStore'
import { handleApiError, OperationType } from '../../lib/api/errors'
import { useCurrencyStore } from '../../store/currencyStore'
import { useBaseCurrencyStore, saveBaseCurrency } from '../../store/baseCurrencyStore'
import ProductPricingEditor from '../../components/admin/ProductPricingEditor'

type Product = Pick<
	ApiProduct,
	'id' | 'name' | 'nameAr' | 'price' | 'image' | 'categoryId'
>
type Category = Pick<ApiCategory, 'id' | 'name'>

export default function Pricing() {
	const { t, i18n } = useTranslation()
	const lang = i18n.language === 'ar' ? 'ar' : 'en'
	const setRates = useCurrencyStore((s) => s.setRates)
	const applyCurrencySettings = useCurrencySettingsStore((s) => s.setSettings)
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)

	const [enabledSet, setEnabledSet] = useState<Set<CurrencyCode>>(
		new Set(SUPPORTED_CURRENCIES),
	)
	const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(BASE_CURRENCY)
	const [savingCurrency, setSavingCurrency] = useState(false)

	const [products, setProducts] = useState<Product[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [filterCategoryId, setFilterCategoryId] = useState<string>('')
	const [selectedProductId, setSelectedProductId] = useState<string>('')
	const [refreshing, setRefreshing] = useState(false)

	const [rates, setLocalRates] = useState<
		{ target: CurrencyCode; rate: number; syncedAt: number; provider: string }[]
	>([])
	const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
	const [syncStatus, setSyncStatus] = useState<string | null>(null)

	const isStale = lastSyncAt
		? Date.now() - lastSyncAt > RATE_STALE_MS
		: true

	useEffect(() => {
		async function fetchProducts() {
			try {
				const list = await listProducts()
				const sorted = list.sort((a, b) => b.createdAt - a.createdAt)
				setProducts(sorted)
				if (!selectedProductId && sorted.length > 0) {
					setSelectedProductId(sorted[0].id)
				}
			} catch (err) {
				handleApiError(err, OperationType.GET, 'products')
			}
		}
		fetchProducts()
	}, [selectedProductId])

	useEffect(() => {
		listCategories()
			.then((cats) => setCategories(cats.map((c) => ({ id: c.id, name: c.name }))))
			.catch((e) => handleApiError(e, OperationType.GET, 'categories'))
	}, [])

	useEffect(() => {
		loadRates()
	}, [])

	useEffect(() => {
		getCurrencySettings()
			.then((s) => {
				setEnabledSet(new Set(s.enabled))
				setDefaultCurrency(s.default)
			})
			.catch((e) => handleApiError(e, OperationType.GET, 'currency_settings'))
	}, [])

	useEffect(() => {
		if (!enabledSet.has(defaultCurrency)) {
			const firstEnabled = SUPPORTED_CURRENCIES.find((c) => enabledSet.has(c))
			if (firstEnabled) setDefaultCurrency(firstEnabled)
		}
	}, [enabledSet, defaultCurrency])

	async function loadRates() {
		try {
			const [stored, meta] = await Promise.all([
				getStoredRates(),
				getSyncMeta(),
			])
			setLocalRates(
				stored.map((r) => ({
					target: r.targetCurrency,
					rate: r.rate,
					syncedAt: r.syncedAt,
					provider: r.provider,
				})),
			)
			setLastSyncAt(meta.lastSyncAt)
			setSyncStatus(meta.status)
			setRates(stored, meta.lastSyncAt)
		} catch (e) {
			handleApiError(e, OperationType.GET, 'currency_rates')
		}
	}

	async function handleRefreshRates() {
		setRefreshing(true)
		try {
			const result = await syncExchangeRates(BASE_CURRENCY)
			if (result.success) {
				toast.success(t('rates_refreshed'))
				await loadRates()
			} else {
				toast.error(result.error ?? t('rates_refresh_failed'))
			}
		} catch (e) {
			handleApiError(e, OperationType.UPDATE, 'currency_rates')
			toast.error(t('rates_refresh_failed'))
		} finally {
			setRefreshing(false)
		}
	}

	async function handleBaseChange(next: CurrencyCode) {
		if (next === baseCurrency) return
		if (!window.confirm(t('base_currency_switch_note'))) return
		try {
			await saveBaseCurrency(next)
			await syncExchangeRates(next)
			await loadRates()
			toast.success(t('base_currency_saved'))
		} catch {
			toast.error(t('base_currency_save_failed'))
		}
	}

	function toggleCurrencyEnabled(code: CurrencyCode) {
		setEnabledSet((prev) => {
			const next = new Set(prev)
			if (next.has(code)) {
				if (next.size === 1) return prev // never empty
				next.delete(code)
			} else {
				next.add(code)
			}
			return next
		})
	}

	async function handleSaveCurrencySettings() {
		// Keep master order; ensure default is enabled.
		const enabled = SUPPORTED_CURRENCIES.filter((c) => enabledSet.has(c))
		if (enabled.length === 0) {
			toast.error(t('at_least_one_currency'))
			return
		}
		const def = enabled.includes(defaultCurrency) ? defaultCurrency : enabled[0]
		const payload: CurrencySettings = { enabled, default: def }

		setSavingCurrency(true)
		try {
			const saved = await updateCurrencySettings(payload)
			applyCurrencySettings(saved)
			setDefaultCurrency(saved.default)
			toast.success(t('currency_settings_saved'))
		} catch (e) {
			const msg = e instanceof Error ? e.message : t('currency_settings_save_failed')
			toast.error(msg)
		} finally {
			setSavingCurrency(false)
		}
	}

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">
					{t('pricing_management')}
				</h1>
				<p className="text-gray-500 mt-1">{t('pricing_management_desc')}</p>
			</div>

			{/* Base Currency Section */}
			<section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-gray-900">
					{t('base_currency')}
				</h2>
				<p className="text-gray-500 text-sm mt-1 mb-4">
					{t('base_currency_desc')}
				</p>
				<div className="max-w-xs">
					<select
						value={baseCurrency}
						onChange={(e) => handleBaseChange(e.target.value as CurrencyCode)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
					>
						{SUPPORTED_CURRENCIES.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
				</div>
			</section>

			{/* Currency Availability Section */}
			<section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-gray-900">
					{t('currency_availability')}
				</h2>
				<p className="text-gray-500 text-sm mt-1 mb-4">
					{t('currency_availability_desc')}
				</p>

				<div className="space-y-2 mb-4">
					{SUPPORTED_CURRENCIES.map((code) => (
						<label key={code} className="flex items-center gap-3 text-sm">
							<input
								type="checkbox"
								checked={enabledSet.has(code)}
								onChange={() => toggleCurrencyEnabled(code)}
								className="w-4 h-4"
							/>
							<span className="font-medium">{code}</span>
							{code === BASE_CURRENCY && (
								<span className="text-xs text-gray-400">{t('aed_base_note')}</span>
							)}
						</label>
					))}
				</div>

				<div className="mb-4 max-w-xs">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('default_currency')}
					</label>
					<select
						value={defaultCurrency}
						onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
					>
						{SUPPORTED_CURRENCIES.filter((c) => enabledSet.has(c)).map((code) => (
							<option key={code} value={code}>
								{code}
							</option>
						))}
					</select>
				</div>

				<button
					onClick={handleSaveCurrencySettings}
					disabled={savingCurrency}
					className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
				>
					<Save className="w-4 h-4" />
					{savingCurrency ? t('saving') : t('save')}
				</button>
			</section>

			{/* Currency Rates Section */}
			<section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-4">
					<h2 className="text-lg font-semibold text-gray-900">
						{t('currency_rates')}
					</h2>
					<button
						onClick={handleRefreshRates}
						disabled={refreshing}
						className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
					>
						<RefreshCw
							className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
						/>
						{t('refresh_rates')}
					</button>
				</div>

				{isStale && (
					<div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-sm">
						<AlertTriangle className="w-4 h-4 shrink-0" />
						{t('rates_stale_warning')}
					</div>
				)}

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-200 text-left text-gray-500">
								<th className="pb-2 pr-4">{t('currency')}</th>
								<th className="pb-2 pr-4">{t('current_rate')}</th>
								<th className="pb-2 pr-4">{t('last_updated')}</th>
								<th className="pb-2">{t('provider')}</th>
							</tr>
						</thead>
						<tbody>
							{rates.length === 0 ? (
								<tr>
									<td colSpan={4} className="py-4 text-gray-400">
										{t('no_rates_yet')}
									</td>
								</tr>
							) : (
								rates.map((r) => (
									<tr key={r.target} className="border-b border-gray-100">
										<td className="py-2 pr-4 font-medium">{r.target}</td>
										<td className="py-2 pr-4">{formatRate(r.rate)}</td>
										<td className="py-2 pr-4">
											{new Date(r.syncedAt).toLocaleString()}
										</td>
										<td className="py-2">{r.provider}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{lastSyncAt && (
					<p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
						{syncStatus === 'success'
							? <CheckCircle2 className="w-3 h-3 text-green-500" />
							: <AlertTriangle className="w-3 h-3 text-amber-500" />}
						{t('last_sync')}: {new Date(lastSyncAt).toLocaleString()}
					</p>
				)}
			</section>

			{/* Product Pricing Section */}
			<section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">
					{t('product_pricing')}
				</h2>

				<div className="mb-4 max-w-xs">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('filter_by_category')}
					</label>
					<select
						value={filterCategoryId}
						onChange={(e) => setFilterCategoryId(e.target.value)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
					>
						<option value="">{t('all_categories')}</option>
						{categories.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</div>

				<div className="grid gap-6 md:grid-cols-[18rem_1fr]">
					<div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
						{products
							.filter(
								(p) => !filterCategoryId || p.categoryId === filterCategoryId,
							)
							.map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => setSelectedProductId(p.id)}
									className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
										selectedProductId === p.id
											? 'bg-gray-900/5'
											: 'hover:bg-gray-50'
									}`}
								>
									<div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden shrink-0">
										{p.image ? (
											<img
												src={p.image}
												alt={p.name}
												className="w-full h-full object-cover"
											/>
										) : null}
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-medium text-gray-900 truncate">
											{p.name}
										</span>
										<span className="text-xs text-gray-500">
											{formatPrice(p.price, baseCurrency, lang)}
										</span>
									</div>
								</button>
							))}
						{products.filter(
							(p) => !filterCategoryId || p.categoryId === filterCategoryId,
						).length === 0 && (
							<p className="px-3 py-4 text-sm text-gray-400">
								No products found.
							</p>
						)}
					</div>

					<div>
						{selectedProductId ? (
							<ProductPricingEditor
								productId={selectedProductId}
								productBasePrice={
									products.find((p) => p.id === selectedProductId)?.price ?? 0
								}
							/>
						) : (
							<p className="text-sm text-gray-400">{t('select_product')}</p>
						)}
					</div>
				</div>
			</section>
		</div>
	)
}
