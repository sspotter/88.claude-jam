# Currency-Aware Admin Product Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category filtering + product thumbnails to the admin Product Pricing picker, a category filter + name search to the Manage Products table, and a per-currency "Prices" tab to the Manage Products Edit modal — all sharing one extracted pricing-editor component.

**Architecture:** Extract the inline per-currency editor from `Pricing.tsx` into a self-contained `ProductPricingEditor` component that sources rates/base via existing hooks and persists via existing services. Both admin surfaces consume it; each surface adds its own category filtering UI.

**Tech Stack:** React 19 + TypeScript, zustand stores, i18next, Tailwind, lucide-react, sonner toasts. Verification: `tsc --noEmit` (root `npm run lint`), tsx-assert pricing tests, vitest (server).

**Conventions in this repo:**
- Frontend type check: `npm run lint` (root) = `tsc --noEmit`.
- Frontend pure-logic tests: `npx tsx src/tests/<name>.test.ts`.
- Server tests: in `server/`, `npx tsc --noEmit` + `npm test`.
- This is a UI/refactor feature with no pricing-engine change; the per-task safety net is `npm run lint` (the existing `pricingEngine.test.ts` guards the engine).

**Reference spec:** `docs/superpowers/specs/2026-06-19-currency-aware-admin-product-editing-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/i18n.ts` | New admin keys (en + ar) | Modify |
| `src/components/admin/ProductPricingEditor.tsx` | Shared self-contained base + per-currency price editor | Create |
| `src/pages/admin/Pricing.tsx` | Product Pricing section → category filter + thumbnail list + shared editor | Modify |
| `src/pages/admin/Products.tsx` | Table category filter + name search; Edit modal Details/Prices tabs | Modify |

---

## Task 1: i18n keys

**Files:**
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add English keys**

In `src/i18n.ts`, find the `en` translation object (it already contains keys like `product_pricing`, `select_product`). Add these keys inside it:

```ts
tab_details: "Details",
tab_prices: "Prices",
filter_by_category: "Filter by category",
all_categories: "All categories",
search_products: "Search products",
save_product_first: "Save the product first to set per-currency prices.",
```

- [ ] **Step 2: Add Arabic keys**

In the same file, find the `ar` translation object and add:

```ts
tab_details: "التفاصيل",
tab_prices: "الأسعار",
filter_by_category: "تصفية حسب الفئة",
all_categories: "كل الفئات",
search_products: "بحث عن المنتجات",
save_product_first: "احفظ المنتج أولاً لتعيين الأسعار لكل عملة.",
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: clean (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(i18n): admin product price tab + filter keys (en + ar)"
```

---

## Task 2: Create `ProductPricingEditor` shared component

**Files:**
- Create: `src/components/admin/ProductPricingEditor.tsx`

This lifts the existing per-currency editor logic out of `Pricing.tsx` verbatim (same load/save/validation behavior), adding a `showBasePrice` flag for the modal.

- [ ] **Step 1: Create the component**

Create `src/components/admin/ProductPricingEditor.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import type { CurrencyCode } from '../../types/pricing'
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
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: clean. (`save_failed`, `loading`, `aed_price_required`, `confirm_zero_price`, `price_badge_manual`, `price_badge_auto`, `estimated_price`, `rate_unavailable`, `leave_empty_convert`, `optional` all already exist in `i18n.ts` — they are used by the current `Pricing.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ProductPricingEditor.tsx
git commit -m "feat(admin): extract shared ProductPricingEditor component"
```

---

## Task 3: Wire `ProductPricingEditor` into Product Pricing page + category filter

**Files:**
- Modify: `src/pages/admin/Pricing.tsx`

Replace the inline editor with the shared component, and replace the flat product dropdown with a category filter + thumbnail list.

- [ ] **Step 1: Update imports**

In `src/pages/admin/Pricing.tsx`, replace the constants import block:

```ts
import {
	BASE_CURRENCY,
	OPTIONAL_CURRENCIES,
	RATE_STALE_MS,
	SUPPORTED_CURRENCIES,
} from '../../lib/pricing/constants'
```

with (drop `OPTIONAL_CURRENCIES`):

```ts
import {
	BASE_CURRENCY,
	RATE_STALE_MS,
	SUPPORTED_CURRENCIES,
} from '../../lib/pricing/constants'
```

Replace the pricing-engine import:

```ts
import {
	buildRateMap,
	estimateConversion,
} from '../../lib/pricing/pricingEngine'
```

with — nothing (remove it entirely; `buildRateMap`/`estimateConversion` are no longer used here).

Remove the product-price service import entirely:

```ts
import {
	getProductPrices,
	saveProductPricing,
} from '../../lib/pricing/productPriceService'
```

Replace the admin api import:

```ts
import { listProducts, updateProduct, updateCurrencySettings } from '../../lib/api/admin'
```

with (drop `updateProduct`, add `listCategories`):

```ts
import { listProducts, listCategories, updateCurrencySettings } from '../../lib/api/admin'
```

Replace the catalog type import:

```ts
import type { Product as ApiProduct } from '../../lib/api/catalog'
```

with:

```ts
import type { Product as ApiProduct, Category as ApiCategory } from '../../lib/api/catalog'
```

Add (anywhere with the other component imports, e.g. after the `useBaseCurrencyStore` import line):

```ts
import ProductPricingEditor from '../../components/admin/ProductPricingEditor'
```

- [ ] **Step 2: Update local types**

Replace:

```ts
type Product = Pick<ApiProduct, 'id' | 'name' | 'nameAr' | 'price'>

type ManualPriceForm = Partial<Record<CurrencyCode, string>>
```

with:

```ts
type Product = Pick<
	ApiProduct,
	'id' | 'name' | 'nameAr' | 'price' | 'image' | 'categoryId'
>
type Category = Pick<ApiCategory, 'id' | 'name'>
```

- [ ] **Step 3: Update `useTranslation` to expose language**

Replace:

```ts
	const { t } = useTranslation()
```

with:

```ts
	const { t, i18n } = useTranslation()
	const lang = i18n.language === 'ar' ? 'ar' : 'en'
```

- [ ] **Step 4: Replace product-pricing state**

Replace this block:

```ts
	const [products, setProducts] = useState<Product[]>([])
	const [selectedProductId, setSelectedProductId] = useState<string>('')
	const [basePrice, setBasePrice] = useState('')
	const [manualPrices, setManualPrices] = useState<ManualPriceForm>({})
	const [savedManual, setSavedManual] = useState<Set<CurrencyCode>>(new Set())
	const [loadingProduct, setLoadingProduct] = useState(false)
	const [saving, setSaving] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
```

with:

```ts
	const [products, setProducts] = useState<Product[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [filterCategoryId, setFilterCategoryId] = useState<string>('')
	const [selectedProductId, setSelectedProductId] = useState<string>('')
	const [refreshing, setRefreshing] = useState(false)
```

- [ ] **Step 5: Remove the now-unused `rateMap` memo**

Delete this entire block:

```ts
	const rateMap = useMemo(() => {
		const entries = rates.map((r) => ({
			baseCurrency: BASE_CURRENCY as CurrencyCode,
			targetCurrency: r.target,
			rate: r.rate,
			provider: r.provider,
			syncedAt: r.syncedAt,
			createdAt: 0,
			updatedAt: 0,
		}))
		return buildRateMap(entries, BASE_CURRENCY)
	}, [rates])
```

This was the only `useMemo` usage in the file, so also update the React import. Replace:

```ts
import { useEffect, useMemo, useState } from 'react'
```

with:

```ts
import { useEffect, useState } from 'react'
```

- [ ] **Step 6: Load categories**

Find the products `useEffect` (the one with `fetchProducts`). Immediately after it, add a categories loader:

```ts
	useEffect(() => {
		listCategories()
			.then((cats) => setCategories(cats.map((c) => ({ id: c.id, name: c.name }))))
			.catch((e) => handleApiError(e, OperationType.GET, 'categories'))
	}, [])
```

- [ ] **Step 7: Remove obsolete product-pricing effects + functions**

Delete the load-on-select effect:

```ts
	useEffect(() => {
		if (!selectedProductId) return
		loadProductPricing(selectedProductId)
	}, [selectedProductId, products])
```

Delete the entire `loadProductPricing` function (from `async function loadProductPricing(productId: string) {` through its closing `}`).

Delete the entire `handleSavePricing` function (from `async function handleSavePricing() {` through its closing `}`).

Delete the line:

```ts
	const aedNumeric = parseFloat(basePrice) || 0
```

- [ ] **Step 8: Replace the Product Pricing section JSX**

Replace the entire `{/* Product Pricing Section */}` `<section>...</section>` (from `<section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">` containing `{t('product_pricing')}` through its closing `</section>`) with:

```tsx
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
								key={selectedProductId}
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
```

- [ ] **Step 9: Type-check**

Run: `npm run lint`
Expected: clean. If the compiler reports `useMemo` or `CurrencyCode` as unused (they may still be used by the rates `rateMap`/`CurrencySettings` code above), remove only the genuinely-unused names from their import lines. Do not remove names still referenced elsewhere in the file.

- [ ] **Step 10: Manual check**

Start the app + server (`npm run dev`). Open Admin → Pricing. Confirm: category filter narrows the list; clicking a product loads its base + override editor; editing + Save shows a success toast and the list price reflects the new base after save.

- [ ] **Step 11: Commit**

```bash
git add src/pages/admin/Pricing.tsx
git commit -m "feat(admin): category-filtered thumbnail picker on Pricing page"
```

---

## Task 4: Manage Products table — category filter + name search

**Files:**
- Modify: `src/pages/admin/Products.tsx`

- [ ] **Step 1: Add filter state**

In `src/pages/admin/Products.tsx`, find:

```ts
  const [isEditing, setIsEditing] = useState<string | null>(null);
```

Add immediately after it:

```ts
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
```

- [ ] **Step 2: Derive filtered products**

Find the line:

```ts
  const getCatName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "Unknown";
```

Add immediately after it:

```ts
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      !filterCategoryId || p.categoryId === filterCategoryId;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameAr ?? "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });
```

- [ ] **Step 3: Add filter UI above the table**

Find the opening of the table card:

```tsx
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
```

Insert this filter bar between those two lines (i.e. right after the outer `div` opens, before `<div className="overflow-x-auto">`):

```tsx
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-stone-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_products")}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none text-sm"
          />
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="sm:w-56 px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none text-sm"
          >
            <option value="">{t("all_categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
```

- [ ] **Step 4: Render the filtered list**

Replace:

```tsx
              {products.map((prod) => (
```

with:

```tsx
              {filteredProducts.map((prod) => (
```

And replace the empty-state check:

```tsx
          {products.length === 0 && (
            <div className="text-center py-10 text-stone-500">
              No products found.
            </div>
          )}
```

with:

```tsx
          {filteredProducts.length === 0 && (
            <div className="text-center py-10 text-stone-500">
              No products found.
            </div>
          )}
```

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Manual check**

In Admin → Products, confirm the search box filters by name (EN/AR) and the category dropdown narrows the table.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/Products.tsx
git commit -m "feat(admin): category filter + name search on Manage Products table"
```

---

## Task 5: Manage Products Edit modal — Details/Prices tabs

**Files:**
- Modify: `src/pages/admin/Products.tsx`

- [ ] **Step 1: Import the editor**

In `src/pages/admin/Products.tsx`, find:

```ts
import ProductPriceCell from "../../components/ProductPriceCell";
```

Add immediately after it:

```ts
import ProductPricingEditor from "../../components/admin/ProductPricingEditor";
```

- [ ] **Step 2: Add tab state**

Find:

```ts
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
```

Add immediately after it:

```ts
  const [activeTab, setActiveTab] = useState<"details" | "prices">("details");
```

- [ ] **Step 3: Reset the tab when opening the modal**

In `startEdit`, find:

```ts
    setImageInputMode("upload");
    setShowModal(true);
  };
```

Replace with:

```ts
    setImageInputMode("upload");
    setActiveTab("details");
    setShowModal(true);
  };
```

In `openNew`, find the same two lines:

```ts
    setImageInputMode("upload");
    setShowModal(true);
  };
```

Replace with:

```ts
    setImageInputMode("upload");
    setActiveTab("details");
    setShowModal(true);
  };
```

- [ ] **Step 4: Add the tab bar**

Find the modal header close-out:

```tsx
              <button
                onClick={closeModal}
                className="text-stone-400 hover:text-[var(--color-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
```

Insert the tab bar between the closing `</div>` (end of header) and `<form`:

```tsx
            </div>

            <div className="flex border-b border-stone-100 px-6">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === "details"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {t("tab_details")}
              </button>
              <button
                type="button"
                onClick={() => isEditing && setActiveTab("prices")}
                disabled={!isEditing}
                title={!isEditing ? t("save_product_first") : undefined}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === "prices"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {t("tab_prices")}
              </button>
            </div>

            <form
```

- [ ] **Step 5: Gate the Details form on the active tab**

The `<form>` opening tag is:

```tsx
            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto flex-grow space-y-4"
            >
```

Replace it with a conditional className that hides (but keeps mounted) the form when on the Prices tab:

```tsx
            <form
              onSubmit={handleSubmit}
              className={`p-6 overflow-y-auto flex-grow space-y-4 ${
                activeTab === "details" ? "" : "hidden"
              }`}
            >
```

- [ ] **Step 6: Add the Prices tab panel**

Find the end of the form (its closing `</form>`) — it is immediately followed by the modal-closing `</div>` markup:

```tsx
            </form>
          </div>
        </div>
      )}
```

Insert the Prices panel between `</form>` and the first `</div>`:

```tsx
            </form>

            {activeTab === "prices" && (
              <div className="p-6 overflow-y-auto flex-grow">
                {isEditing ? (
                  <ProductPricingEditor
                    productId={isEditing}
                    productBasePrice={form.price}
                    showBasePrice={false}
                    onSaved={fetchProducts}
                  />
                ) : (
                  <p className="text-sm text-stone-500">
                    {t("save_product_first")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 7: Type-check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 8: Manual check**

In Admin → Products: open Edit on an existing product → the modal shows Details + Prices tabs. The Prices tab shows per-currency override inputs (no base field), with estimates based on the Details base price. Set/clear an override, Save → success toast, list refreshes. Open Add Product → the Prices tab is disabled with the "save first" hint.

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin/Products.tsx
git commit -m "feat(admin): per-currency Prices tab in Manage Products edit modal"
```

---

## Final Verification

- [ ] **Frontend type check** — Run: `npm run lint` → clean.
- [ ] **Pricing engine tests** — Run: `npx tsx src/tests/pricingEngine.test.ts` → pass.
- [ ] **Server unchanged but sanity-check** — Run (in `server/`): `npx tsc --noEmit && npm test` → clean + green.
- [ ] **Manual end-to-end:**
  - Pricing page: category filter + thumbnail list selects a product; base + override edit saves.
  - Manage Products: table category filter + name search work; Edit modal Prices tab edits overrides on an existing product; Add Product disables the Prices tab.
- [ ] **Final commit (if any stragglers):**

```bash
git add -A
git commit -m "chore(admin): finalize currency-aware product editing"
```
