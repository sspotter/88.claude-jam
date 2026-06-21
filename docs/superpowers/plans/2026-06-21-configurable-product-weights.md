# Configurable Product Weights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins choose, per product, which weights a customer sees and price them from a 2kg anchor with linear auto-calc plus optional per-weight overrides.

**Architecture:** Per-product weight config (`visibleWeights` + base-currency `weightOverrides`) is stored as a JSON blob in the `Setting` table under id `product_weights`, mirroring the existing `product_prices` pattern. The product's existing base price is the 2kg anchor; other weights resolve linearly (`anchor × kg/2`) unless overridden. A small weight-aware resolver wraps the existing `resolveProductPrice` engine, including the documented §3.3 rule for per-currency overrides. The admin Pricing-tab editor gains a Weights block; the storefront `ProductView` renders only visible weights and defaults selection to 2kg.

**Tech Stack:** React + TypeScript (Vite), Zustand stores, Express + Prisma (PostgreSQL `Setting` JSON), `tsx`-run assertion tests.

**Spec:** `docs/superpowers/specs/2026-06-21-configurable-product-weights-design.md`

**Migration note (read first):** Going forward `product.price` is interpreted as the **2kg anchor price** for every product. Existing `per_kg` products stored `product.price` as price-*per-kg*, so their derived weight prices will change until an admin re-saves the 2kg price in the Pricing tab. This branch is pre-production; a one-time admin re-set is acceptable and expected. Historical orders/carts snapshot price + weight string and are unaffected.

**Test command:** `npx tsx <path-to-test-file>` (matches the existing `src/tests/*.test.ts` harness).

---

## File Structure

- `src/types/pricing.ts` — change `WeightOption` (`3kg`→`5kg`); add `ProductWeightConfig`.
- `src/lib/pricing/weightPricing.ts` — update master list/multipliers; add `ANCHOR_WEIGHT`, `DEFAULT_VISIBLE_WEIGHTS`, `resolveWeightBasePrice`, `resolveWeightedPrice`.
- `src/lib/pricing/productWeightService.ts` — **new** client service (get all / get one / save one).
- `src/hooks/usePricing.ts` — add `useProductWeightsCache` + `useResolvedWeightPrice`.
- `server/src/routes/admin.routes.ts` — add `GET`/`PUT /pricing/product-weights` (audited).
- `server/src/routes/catalog.routes.ts` — add public `GET /pricing/product-weights`.
- `src/components/admin/ProductPricingEditor.tsx` — add Weights block (checkbox + price per weight; 2kg = anchor).
- `src/pages/ProductView.tsx` — render `visibleWeights`, default 2kg, weight-aware price.
- `src/i18n.ts` — new label keys (en + ar).
- `src/tests/weightPricing.test.ts` — update `3kg`→`5kg`; add resolver tests.

---

## Task 1: Master weight list (types + constants)

**Files:**
- Modify: `src/types/pricing.ts:12` (the `WeightOption` type)
- Modify: `src/lib/pricing/weightPricing.ts:4-16`
- Test: `src/tests/weightPricing.test.ts:44-46,69-71`

- [ ] **Step 1: Update existing tests to the new master list (these will fail first)**

In `src/tests/weightPricing.test.ts`, replace the `3kg` test (lines 44-46) with:

```ts
test('5kg at 10 AED/kg = 50 AED', () => {
	assert.equal(calculateAedUnitPrice(10, '5kg', 'per_kg'), 50)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx src/tests/weightPricing.test.ts`
Expected: FAIL — `5kg at 10 AED/kg = 50 AED` (getWeightMultiplier('5kg') falls back to 1 → 10, not 50).

- [ ] **Step 3: Update the `WeightOption` type**

In `src/types/pricing.ts`, change line 12 to:

```ts
export type WeightOption = '500g' | '1kg' | '2kg' | '5kg'
```

- [ ] **Step 4: Update the constants in `weightPricing.ts`**

Replace lines 4-16 of `src/lib/pricing/weightPricing.ts` with:

```ts
export const WEIGHT_MULTIPLIERS: Record<WeightOption, number> = {
	'500g': 0.5,
	'1kg': 1,
	'2kg': 2,
	'5kg': 5,
}

export const WEIGHT_OPTIONS: WeightOption[] = [
	'500g',
	'1kg',
	'2kg',
	'5kg',
]

/** The weight whose price the admin sets directly; all others derive from it. */
export const ANCHOR_WEIGHT: WeightOption = '2kg'

/** Weights shown for a product that has no saved config. */
export const DEFAULT_VISIBLE_WEIGHTS: WeightOption[] = ['500g', '1kg', '2kg', '5kg']
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx src/tests/weightPricing.test.ts`
Expected: PASS (all tests, including the new 5kg case).

- [ ] **Step 6: Commit**

```bash
git add src/types/pricing.ts src/lib/pricing/weightPricing.ts src/tests/weightPricing.test.ts
git commit -m "feat(pricing): switch weight master list 3kg -> 5kg, add anchor constants"
```

---

## Task 2: Base-currency weight resolver

Adds `resolveWeightBasePrice(anchor, weight, overrides)` — the override-or-linear base-currency price for a weight.

**Files:**
- Modify: `src/lib/pricing/weightPricing.ts` (add function)
- Test: `src/tests/weightPricing.test.ts` (add cases)

- [ ] **Step 1: Write failing tests**

Append to `src/tests/weightPricing.test.ts` (before the final summary `console.log`):

```ts
test('resolveWeightBasePrice: linear from 2kg anchor (anchor=100)', () => {
	assert.equal(resolveWeightBasePrice(100, '500g', {}), 25)
	assert.equal(resolveWeightBasePrice(100, '1kg', {}), 50)
	assert.equal(resolveWeightBasePrice(100, '2kg', {}), 100)
	assert.equal(resolveWeightBasePrice(100, '5kg', {}), 250)
})

test('resolveWeightBasePrice: override wins over linear', () => {
	assert.equal(resolveWeightBasePrice(100, '5kg', { '5kg': 199 }), 199)
})

test('resolveWeightBasePrice: rounds linear result to 2dp', () => {
	assert.equal(resolveWeightBasePrice(33, '500g', {}), 8.25)
})
```

Add `resolveWeightBasePrice` to the import block at the top of the test file:

```ts
import {
	calculateAedUnitPrice,
	getCartLineId,
	getWeightMultiplier,
	resolveWeightBasePrice,
} from '../lib/pricing/weightPricing'
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx src/tests/weightPricing.test.ts`
Expected: FAIL — `resolveWeightBasePrice is not a function`.

- [ ] **Step 3: Implement `resolveWeightBasePrice`**

Add to `src/lib/pricing/weightPricing.ts` (after `getWeightMultiplier`):

```ts
/**
 * Base-currency price for a single weight. Uses the per-weight override when
 * present, otherwise derives linearly from the 2kg anchor: anchor × kg / 2.
 */
export function resolveWeightBasePrice(
	anchorBasePrice: number,
	weight: string,
	weightOverrides: Partial<Record<WeightOption, number>> = {},
): number {
	const override = weightOverrides[weight as WeightOption]
	if (override !== undefined && override !== null) {
		return roundPrice(override)
	}
	const kg = getWeightMultiplier(weight)
	return roundPrice((anchorBasePrice * kg) / 2)
}
```

(`roundPrice` is already imported at the top of `weightPricing.ts`.)

- [ ] **Step 4: Run to verify pass**

Run: `npx tsx src/tests/weightPricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/weightPricing.ts src/tests/weightPricing.test.ts
git commit -m "feat(pricing): add resolveWeightBasePrice (override-or-linear from 2kg)"
```

---

## Task 3: Weight-aware currency resolver

Adds `resolveWeightedPrice(...)` returning a full `ResolvedPrice`, layering currency on top of the base weight price and implementing the §3.3 per-currency-anchor rule.

**Files:**
- Modify: `src/lib/pricing/weightPricing.ts` (add function + imports)
- Test: `src/tests/weightPricing.test.ts` (add cases)

- [ ] **Step 1: Write failing tests**

Append to `src/tests/weightPricing.test.ts` (before the summary log):

```ts
test('resolveWeightedPrice: base currency returns base weight price', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '5kg', weightOverrides: {},
		baseCurrency: 'AED', targetCurrency: 'AED', manualPrices: {}, rates: {},
	})
	assert.equal(r.price, 250)
	assert.equal(r.currency, 'AED')
})

test('resolveWeightedPrice: converts base weight price via rate', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '1kg', weightOverrides: {},
		baseCurrency: 'AED', targetCurrency: 'USD', manualPrices: {}, rates: { USD: 0.27 },
	})
	assert.equal(r.price, 13.5) // 50 × 0.27
	assert.equal(r.source, 'converted')
})

test('resolveWeightedPrice: §3.3 per-currency override is the 2kg anchor, scaled linearly', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '5kg', weightOverrides: {},
		baseCurrency: 'AED', targetCurrency: 'USD', manualPrices: { USD: 30 }, rates: { USD: 0.27 },
	})
	assert.equal(r.price, 75) // 30 × 5 / 2, NOT a rate conversion
	assert.equal(r.source, 'manual')
})

test('resolveWeightedPrice: base per-weight override converts when currency has no override', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '5kg', weightOverrides: { '5kg': 200 },
		baseCurrency: 'AED', targetCurrency: 'USD', manualPrices: {}, rates: { USD: 0.5 },
	})
	assert.equal(r.price, 100) // 200 × 0.5
})
```

Extend the test import block to include `resolveWeightedPrice`.

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx src/tests/weightPricing.test.ts`
Expected: FAIL — `resolveWeightedPrice is not a function`.

- [ ] **Step 3: Implement `resolveWeightedPrice`**

At the top of `src/lib/pricing/weightPricing.ts`, extend the imports:

```ts
import type {
	CurrencyCode,
	ProductPricingType,
	ResolvedPrice,
	WeightOption,
} from '../../types/pricing'
import { resolveProductPrice, roundPrice } from './pricingEngine'
```

Add this function (after `resolveWeightBasePrice`):

```ts
export interface WeightedPriceInput {
	/** Product 2kg anchor price in the base currency. */
	anchorBasePrice: number
	weight: string
	weightOverrides?: Partial<Record<WeightOption, number>>
	baseCurrency: CurrencyCode
	targetCurrency: CurrencyCode
	/** Per-currency manual overrides, interpreted as the 2kg anchor in that currency. */
	manualPrices?: Partial<Record<CurrencyCode, number>>
	rates?: Partial<Record<CurrencyCode, number>>
}

/**
 * Customer-facing price for (product weight, currency).
 *
 * Layer 1: base-currency weight price = override-or-linear (resolveWeightBasePrice).
 * Layer 2 currency:
 *   - target == base            → the base weight price
 *   - per-currency override set  → §3.3: treat it as the 2kg anchor in that
 *                                  currency and scale linearly (override × kg/2)
 *   - else                       → convert the base weight price via rate
 *                                  (falls back to base amount if no rate)
 */
export function resolveWeightedPrice(input: WeightedPriceInput): ResolvedPrice {
	const {
		anchorBasePrice,
		weight,
		weightOverrides = {},
		baseCurrency,
		targetCurrency,
		manualPrices = {},
		rates = {},
	} = input

	const baseWeightPrice = resolveWeightBasePrice(anchorBasePrice, weight, weightOverrides)

	if (targetCurrency !== baseCurrency) {
		const anchorOverride = manualPrices[targetCurrency]
		if (anchorOverride !== undefined && anchorOverride !== null) {
			const kg = getWeightMultiplier(weight)
			return {
				price: roundPrice((anchorOverride * kg) / 2),
				currency: targetCurrency,
				source: 'manual',
				exchangeRate: null,
				basePrice: baseWeightPrice,
				baseCurrency,
			}
		}
	}

	// No per-currency anchor override: convert the base weight price via rate.
	return resolveProductPrice({
		basePrice: baseWeightPrice,
		baseCurrency,
		targetCurrency,
		manualPrices: {},
		rates,
	})
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx tsx src/tests/weightPricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/weightPricing.ts src/tests/weightPricing.test.ts
git commit -m "feat(pricing): add resolveWeightedPrice with per-currency anchor scaling"
```

---

## Task 4: Client type + weight config service

**Files:**
- Modify: `src/types/pricing.ts` (add `ProductWeightConfig`)
- Create: `src/lib/pricing/productWeightService.ts`

- [ ] **Step 1: Add the `ProductWeightConfig` type**

Append to `src/types/pricing.ts`:

```ts
export interface ProductWeightConfig {
	productId: string
	visibleWeights: WeightOption[]
	weightOverrides: Partial<Record<WeightOption, number>>
}
```

- [ ] **Step 2: Create the service**

Create `src/lib/pricing/productWeightService.ts`:

```ts
import { apiFetch } from '../api/client'
import type { ProductWeightConfig, WeightOption } from '../../types/pricing'
import { DEFAULT_VISIBLE_WEIGHTS } from './weightPricing'

interface ConfigRow {
	productId: string
	visibleWeights: WeightOption[]
	weightOverrides: Partial<Record<WeightOption, number>>
}

function mapRow(row: ConfigRow): ProductWeightConfig {
	return {
		productId: row.productId,
		visibleWeights:
			Array.isArray(row.visibleWeights) && row.visibleWeights.length > 0
				? row.visibleWeights
				: [...DEFAULT_VISIBLE_WEIGHTS],
		weightOverrides: row.weightOverrides ?? {},
	}
}

export async function getAllProductWeights(): Promise<ProductWeightConfig[]> {
	const res = await apiFetch<{ configs: ConfigRow[] }>(
		'/api/pricing/product-weights',
	)
	return res.configs.map(mapRow)
}

export async function getProductWeights(
	productId: string,
): Promise<ProductWeightConfig | null> {
	const res = await apiFetch<{ configs: ConfigRow[] }>(
		`/api/pricing/product-weights?productId=${encodeURIComponent(productId)}`,
	)
	const row = res.configs.find((c) => c.productId === productId)
	return row ? mapRow(row) : null
}

export async function saveProductWeights(
	config: ProductWeightConfig,
): Promise<void> {
	await apiFetch('/api/admin/pricing/product-weights', {
		method: 'PUT',
		auth: true,
		body: JSON.stringify({ config }),
	})
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors from the new file).

- [ ] **Step 4: Commit**

```bash
git add src/types/pricing.ts src/lib/pricing/productWeightService.ts
git commit -m "feat(pricing): add ProductWeightConfig type + client service"
```

---

## Task 5: Server admin routes (GET + PUT product-weights)

**Files:**
- Modify: `server/src/routes/admin.routes.ts` (add after the `product-prices` DELETE route, ~line 681)

- [ ] **Step 1: Add the type + routes**

In `server/src/routes/admin.routes.ts`, just below the `ProductPriceRow` type (near line 592) add:

```ts
type ProductWeightRow = {
  productId: string;
  visibleWeights: string[];
  weightOverrides: Record<string, number>;
};
```

Then, after the `router.delete("/pricing/product-prices", ...)` handler, add:

```ts
router.get("/pricing/product-weights", async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId as string | undefined;
    const data = await getPricingSetting("product_weights", { configs: [] as ProductWeightRow[] });
    const configs = productId
      ? data.configs.filter((c) => c.productId === productId)
      : data.configs;
    return res.json({ configs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product weights." });
  }
});

router.put("/pricing/product-weights", async (req: Request, res: Response) => {
  try {
    const incoming = req.body?.config as ProductWeightRow | undefined;
    if (!incoming?.productId) {
      return res.status(400).json({ error: "config.productId is required." });
    }
    const data = await getPricingSetting("product_weights", { configs: [] as ProductWeightRow[] });
    const before = { configs: data.configs };
    const byId = new Map(data.configs.map((c) => [c.productId, c]));
    byId.set(incoming.productId, {
      productId: incoming.productId,
      visibleWeights: Array.isArray(incoming.visibleWeights) ? incoming.visibleWeights : [],
      weightOverrides: incoming.weightOverrides ?? {},
    });
    const configs = Array.from(byId.values());
    await prisma.setting.upsert({
      where: { id: "product_weights" },
      update: { value: { configs } },
      create: { id: "product_weights", value: { configs } },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "product_weights", entityId: incoming.productId, before, after: { configs } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to save product weights." });
  }
});
```

- [ ] **Step 2: Type-check the server**

Run: `cd server && npx tsc --noEmit && cd ..`
Expected: PASS.

- [ ] **Step 3: Manual verification (server running on :5000, admin token in $TOKEN)**

Run:

```bash
curl -s -X PUT http://localhost:5000/api/admin/pricing/product-weights \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"config":{"productId":"TEST","visibleWeights":["1kg","2kg"],"weightOverrides":{"1kg":42}}}'
curl -s "http://localhost:5000/api/admin/pricing/product-weights?productId=TEST" -H "Authorization: Bearer $TOKEN"
```

Expected: first returns `{"success":true}`; second returns the config with `visibleWeights:["1kg","2kg"]` and `weightOverrides:{"1kg":42}`.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/admin.routes.ts
git commit -m "feat(server): admin GET/PUT /pricing/product-weights (audited)"
```

---

## Task 6: Server public read route

**Files:**
- Modify: `server/src/routes/catalog.routes.ts` (add after the public `product-prices` GET, ~line 180)

- [ ] **Step 1: Add the public route**

After the existing `router.get("/pricing/product-prices", ...)` handler in `server/src/routes/catalog.routes.ts`, add:

```ts
/**
 * GET /api/pricing/product-weights?productId= — public read for storefront.
 */
router.get("/pricing/product-weights", async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId as string | undefined;
    const setting = await prisma.setting.findUnique({ where: { id: "product_weights" } });
    const all = ((setting?.value as { configs?: { productId: string }[] } | null)?.configs) ?? [];
    const configs = productId ? all.filter((c) => c.productId === productId) : all;
    return res.json({ configs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product weights." });
  }
});
```

- [ ] **Step 2: Type-check the server**

Run: `cd server && npx tsc --noEmit && cd ..`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Run: `curl -s "http://localhost:5000/api/pricing/product-weights?productId=TEST"`
Expected: `{"configs":[{"productId":"TEST",...}]}` (the row saved in Task 5).

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/catalog.routes.ts
git commit -m "feat(server): public GET /pricing/product-weights"
```

---

## Task 7: Storefront hooks (`useProductWeightsCache`, `useResolvedWeightPrice`)

**Files:**
- Modify: `src/hooks/usePricing.ts`

- [ ] **Step 1: Add imports**

In `src/hooks/usePricing.ts`, extend the existing imports:

```ts
import type {
	CurrencyCode,
	ProductPrice,
	ProductWeightConfig,
	ResolvedPrice,
	WeightOption,
} from '../types/pricing'
import { resolveWeightedPrice } from '../lib/pricing/weightPricing'
import { getAllProductWeights } from '../lib/pricing/productWeightService'
```

(`buildManualPriceMap` is already imported; keep it.)

- [ ] **Step 2: Add `useProductWeightsCache`**

Add to `src/hooks/usePricing.ts` (after `useProductPricesCache`):

```ts
export function useProductWeightsCache() {
	const [weightsByProduct, setWeightsByProduct] = useState<
		Map<string, ProductWeightConfig>
	>(new Map())
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				const all = await getAllProductWeights()
				if (cancelled) return
				const map = new Map<string, ProductWeightConfig>()
				for (const config of all) map.set(config.productId, config)
				setWeightsByProduct(map)
			} finally {
				if (!cancelled) setLoaded(true)
			}
		}
		load()
		return () => { cancelled = true }
	}, [])

	return { weightsByProduct, loaded }
}
```

- [ ] **Step 3: Add `useResolvedWeightPrice`**

Add to `src/hooks/usePricing.ts` (after `useResolvedPrice`):

```ts
export function useResolvedWeightPrice(
	productId: string,
	anchorBasePrice: number,
	weight: string,
	weightOverrides: Partial<Record<WeightOption, number>>,
): ResolvedPrice {
	const selectedCurrency = useCurrencyStore((s) => s.currency)
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)
	const { rateMap } = useCurrencyRates()
	const { pricesByProduct } = useProductPricesCache()

	return useMemo(() => {
		const productPrices = pricesByProduct.get(productId) ?? []
		const manualPrices = buildManualPriceMap(productPrices)
		return resolveWeightedPrice({
			anchorBasePrice,
			weight,
			weightOverrides,
			baseCurrency,
			targetCurrency: selectedCurrency,
			manualPrices,
			rates: rateMap,
		})
	}, [productId, anchorBasePrice, weight, weightOverrides, baseCurrency, selectedCurrency, pricesByProduct, rateMap])
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePricing.ts
git commit -m "feat(pricing): useProductWeightsCache + useResolvedWeightPrice hooks"
```

---

## Task 8: Admin editor — Weights block

Add a Weights block to `ProductPricingEditor`: a visibility checkbox + price input per master weight. The 2kg input is the anchor (= the existing base price). Saving persists the weight config alongside the existing currency save.

**Files:**
- Modify: `src/components/admin/ProductPricingEditor.tsx`
- Modify: `src/i18n.ts` (keys added in Task 10; use the keys now)

- [ ] **Step 1: Add imports + state**

In `src/components/admin/ProductPricingEditor.tsx`, extend imports:

```ts
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
```

Add state inside the component (next to the existing `useState` calls):

```ts
const [visibleWeights, setVisibleWeights] = useState<Set<WeightOption>>(
	new Set(DEFAULT_VISIBLE_WEIGHTS),
)
const [weightOverrides, setWeightOverrides] = useState<
	Partial<Record<WeightOption, string>>
>({})
```

- [ ] **Step 2: Load weight config inside `loadProductPricing`**

In `loadProductPricing`, after the existing per-currency load (just before `setManualPrices(manual)`), add:

```ts
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
```

- [ ] **Step 3: Persist weight config in `handleSave`**

In `handleSave`, after the existing `await saveProductPricing(productId, base, parsedManual)` call (and before the `toast.success`), add:

```ts
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
```

- [ ] **Step 4: Add helpers for the UI**

Add inside the component (before the `return`):

```ts
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
```

- [ ] **Step 5: Render the Weights block**

In the JSX, immediately after the base-price `<div>` block (the one gated by `showBasePrice`, ending at line ~145) and before the `<p>{t('leave_empty_convert')}</p>`, insert:

```tsx
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
```

(The 2kg anchor price is the base-price field above; editing it updates `baseNumeric`, which re-derives every `placeholder`.)

- [ ] **Step 6: Type-check + run the app**

Run: `npx tsc --noEmit`
Expected: PASS.

Then start the app, open Admin → Pricing, pick a product: confirm 4 weight rows render, 2kg shows the anchor badge, unchecking down to one weight is blocked, and Save shows a success toast. Reload and confirm toggles + overrides persist.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ProductPricingEditor.tsx
git commit -m "feat(admin): per-product visible-weights + override editor"
```

---

## Task 9: Storefront — render visible weights, default 2kg

**Files:**
- Modify: `src/pages/ProductView.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/ProductView.tsx`, replace the weightPricing import (lines 14-17) and the `useResolvedPrice` import (line 12) usage:

```ts
import { useResolvedWeightPrice, useProductWeightsCache } from "../hooks/usePricing";
import {
  ANCHOR_WEIGHT,
  DEFAULT_VISIBLE_WEIGHTS,
} from "../lib/pricing/weightPricing";
```

Remove the now-unused `calculateAedUnitPrice` / `WEIGHT_OPTIONS` / `useResolvedPrice` imports. Keep the `ProductPricingType` import — `pricingType` is still used (see Step 2).

- [ ] **Step 2: Replace weight + price state/derivation**

Replace the block at lines 29 and 34-47 with (note `pricingType` is retained — `handleAddToCart` still uses it; `isWeightBased` and `aedUnitPrice` are dropped):

```ts
const [selectedWeight, setSelectedWeight] = useState<string>(ANCHOR_WEIGHT);

const pricingType: ProductPricingType = product?.pricingType ?? "fixed";

const { weightsByProduct } = useProductWeightsCache();
const weightConfig = product ? weightsByProduct.get(product.id) : undefined;
const visibleWeights = weightConfig?.visibleWeights ?? DEFAULT_VISIBLE_WEIGHTS;
const weightOverrides = weightConfig?.weightOverrides ?? {};

// Keep the selected weight valid for this product's visible set.
useEffect(() => {
  if (!visibleWeights.includes(selectedWeight as never)) {
    setSelectedWeight(
      visibleWeights.includes(ANCHOR_WEIGHT) ? ANCHOR_WEIGHT : visibleWeights[0],
    );
  }
}, [visibleWeights, selectedWeight]);

const resolvedPrice = useResolvedWeightPrice(
  product?.id ?? "",
  product?.price ?? 0,
  selectedWeight,
  weightOverrides,
);
```

- [ ] **Step 3: Update add-to-cart options**

In `handleAddToCart`, replace the `buildCartItem` options object with:

```ts
{
  pricingType,
  weight: selectedWeight,
},
```

(`resolvedPrice.basePrice` already carries this weight's base price, so currency repricing of the cart line stays correct via `repriceCartItem`.)

- [ ] **Step 4: Render only visible weights**

Replace the weights `.map` (lines 519-529, currently `WEIGHT_OPTIONS.map`) with:

```tsx
<div className="anp-weights">
  {visibleWeights.map((w) => (
    <button
      key={w}
      onClick={() => setSelectedWeight(w)}
      className={`anp-weight-btn${selectedWeight === w ? " anp-weight-btn--active" : ""}`}
    >
      {w}
    </button>
  ))}
</div>
```

- [ ] **Step 5: Type-check + run the app**

Run: `npx tsc --noEmit`
Expected: PASS.

Then in the storefront: open a product configured in Task 8 — confirm only the visible weights show, 2kg is selected by default, selecting a weight updates the price (linear unless overridden), and Add to Cart adds the correct weighted line. Switch currency and confirm the price converts.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProductView.tsx
git commit -m "feat(storefront): render per-product visible weights, default 2kg"
```

---

## Task 10: i18n keys

**Files:**
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add English keys**

In `src/i18n.ts`, in the English (`en`) translation resource object, near the existing pricing keys (e.g. `price_badge_auto`), add:

```ts
weights: 'Weights',
weights_desc: 'Choose which weights customers see. The 2kg price is the anchor — other weights are calculated from it unless you set a price.',
anchor_weight_badge: 'Anchor (2kg)',
at_least_one_weight: 'At least one weight must stay visible.',
show: 'Show',
```

- [ ] **Step 2: Add Arabic keys**

In the Arabic (`ar`) translation resource object, add:

```ts
weights: 'الأوزان',
weights_desc: 'اختر الأوزان التي تظهر للعملاء. سعر 2 كجم هو الأساس — تُحسب باقي الأوزان منه ما لم تحدد سعرًا.',
anchor_weight_badge: 'الأساس (2 كجم)',
at_least_one_weight: 'يجب أن يبقى وزن واحد على الأقل ظاهرًا.',
show: 'إظهار',
```

- [ ] **Step 3: Type-check + verify**

Run: `npx tsc --noEmit`
Expected: PASS.

Reload Admin → Pricing in both languages; confirm the Weights block labels render (no raw `weights` key text) in English and Arabic.

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(i18n): weight editor labels (en + ar)"
```

---

## Final verification

- [ ] Run all pricing tests: `npx tsx src/tests/weightPricing.test.ts` and `npx tsx src/tests/pricingEngine.test.ts` — expect PASS.
- [ ] `npx tsc --noEmit` (root) and `cd server && npx tsc --noEmit` — expect PASS.
- [ ] End-to-end: configure a product (toggle off one weight, override one weight) → storefront shows the right chips/prices → add to cart → switch currency → price converts. Confirm the §3.3 rule by setting a per-currency override and checking weighted prices scale linearly in that currency.

## Notes / accepted edge cases

- **Migration:** `product.price` now means the 2kg anchor; existing `per_kg` products need a one-time admin re-save (see header note).
- **§3.3:** when both a per-currency override and base per-weight overrides exist, the per-currency value wins in that currency and scales linearly from 2kg; base per-weight overrides apply only to the base currency and to currencies resolved by rate. Documented and intentional.
- **`useProductWeightsCache`** loads all configs (mirrors `useProductPricesCache`, which already loads all product prices) — consistent with existing patterns at this catalog size.
