# Admin-Selectable Base Currency + Currency Labels — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pricing base currency an admin-selectable runtime setting (default AED), re-anchoring rates and pricing to it, and render all currencies with explicit per-language labels (EGP / ج م).

**Architecture:** `BASE_CURRENCY` stops being a hardcoded constant. The active base lives in a `base_currency` `Setting` row (server) and a `baseCurrencyStore` (client). The pricing engine takes `baseCurrency` as a parameter; the base price is the currency-agnostic `product.price`; manual `product_prices` rows remain per-currency overrides; the rate API/sync is parameterized by base. Display uses a `CURRENCY_LABELS` table.

**Tech Stack:** React 19 + zustand + i18next (frontend), Express + Prisma `Setting` key/value table (server), vitest (server tests), tsx-assert scripts (frontend pricing tests).

**Conventions in this repo:**
- Frontend pure-logic tests: tsx-assert scripts in `src/tests/*.test.ts`, run with `npx tsx src/tests/<name>.test.ts` (see `src/tests/pricingEngine.test.ts`).
- Server tests: vitest in `server/src/**/*.test.ts`, run with `npm test` in `server/`.
- Frontend type check: `npm run lint` (root) = `tsc --noEmit`.
- If this tree is not a git repo, treat the **Commit** steps as optional checkpoints.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/pricing/constants.ts` | Add `CURRENCY_LABELS`; keep `BASE_CURRENCY` as the default seed | Modify |
| `src/lib/pricing/formatPrice.ts` | Format number + append per-language label | Modify |
| `src/types/pricing.ts` | `ResolvedPrice` → `basePrice`/`baseCurrency`/`fallbackToBase` | Modify |
| `src/lib/pricing/pricingEngine.ts` | `baseCurrency` param; base-currency short-circuit | Modify |
| `src/lib/pricing/currencyService.ts` | Base-parameterized rate fetch/sync | Modify |
| `src/store/baseCurrencyStore.ts` | Hold active base; load/save | Create |
| `src/hooks/usePricing.ts` | Thread active base into engine | Modify |
| `src/components/PriceDisplay.tsx` | Read renamed fields + language | Modify |
| `src/components/ProductListPrice.tsx`, `CartPriceLabel.tsx` | Pass base price + language | Modify |
| `src/main.tsx` | Bootstrap `loadBaseCurrency()` | Modify |
| `src/pages/admin/Pricing.tsx` | Base-currency selector + dynamic labels | Modify |
| `src/i18n.ts` | New admin keys (en + ar) | Modify |
| `server/src/services/currencySettings.ts` | `normalizeBaseCurrency` + default | Modify |
| `server/src/services/currencySettings.test.ts` | base-currency validation tests | Modify |
| `server/src/routes/catalog.routes.ts` | `GET /api/settings/base-currency` | Modify |
| `server/src/routes/admin.routes.ts` | `PUT /api/admin/settings/base-currency` | Modify |

---

## Task 1: Currency labels + formatPrice

**Files:**
- Modify: `src/lib/pricing/constants.ts`
- Modify: `src/lib/pricing/formatPrice.ts`
- Test: `src/tests/formatPrice.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/tests/formatPrice.test.ts`:

```ts
/** Run with: npx tsx src/tests/formatPrice.test.ts */
import assert from 'node:assert/strict'
import { formatPrice } from '../lib/pricing/formatPrice'

let failed = 0
function test(label: string, fn: () => void) {
	try { fn(); console.log(`  ✓  ${label}`) }
	catch (e) { failed++; console.error(`  ✗  ${label}\n     ${(e as Error).message}`) }
}

test('English EGP uses the EGP label', () => {
	assert.equal(formatPrice(50, 'EGP', 'en'), '50.00 EGP')
})
test('Arabic EGP uses the ج م label', () => {
	const out = formatPrice(50, 'EGP', 'ar')
	assert.ok(out.includes('ج م'), `expected ج م in "${out}"`)
})
test('defaults to English when no language passed', () => {
	assert.equal(formatPrice(10, 'USD'), '10.00 USD')
})

if (failed > 0) { console.error(`\n${failed} failed`); process.exit(1) }
console.log('\nformatPrice OK')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/tests/formatPrice.test.ts`
Expected: FAIL (label not appended / wrong format).

- [ ] **Step 3: Add `CURRENCY_LABELS` to constants**

In `src/lib/pricing/constants.ts`, append:

```ts
export const CURRENCY_LABELS: Record<CurrencyCode, { en: string; ar: string }> = {
	AED: { en: 'AED', ar: 'د.إ' },
	USD: { en: 'USD', ar: '$' },
	EGP: { en: 'EGP', ar: 'ج م' },
	SAR: { en: 'SAR', ar: 'ر.س' },
	EUR: { en: 'EUR', ar: '€' },
}
```

- [ ] **Step 4: Rewrite `formatPrice`**

Replace the body of `src/lib/pricing/formatPrice.ts`:

```ts
import type { CurrencyCode } from '../../types/pricing'
import { CURRENCY_LABELS } from './constants'

export type DisplayLang = 'en' | 'ar'

export function formatPrice(
	amount: number,
	currency: CurrencyCode,
	lang: DisplayLang = 'en',
): string {
	const num = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount)
	const label = CURRENCY_LABELS[currency]?.[lang] ?? currency
	return `${num} ${label}`
}

export function formatRate(rate: number): string {
	return rate.toFixed(4)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx src/tests/formatPrice.test.ts`
Expected: `formatPrice OK`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pricing/constants.ts src/lib/pricing/formatPrice.ts src/tests/formatPrice.test.ts
git commit -m "feat(pricing): per-language currency labels (EGP / ج م)"
```

---

## Task 2: Pricing engine — dynamic base currency

**Files:**
- Modify: `src/types/pricing.ts`
- Modify: `src/lib/pricing/pricingEngine.ts`
- Test: `src/tests/pricingEngine.test.ts`

- [ ] **Step 1: Add failing tests for a non-AED base**

In `src/tests/pricingEngine.test.ts`, add these tests (after the existing ones, before the pass/fail summary):

```ts
test('EGP base: base currency returns face value', () => {
	const r = resolveProductPrice({ basePrice: 50, baseCurrency: 'EGP', targetCurrency: 'EGP' })
	assert.equal(r.price, 50)
	assert.equal(r.currency, 'EGP')
	assert.equal(r.source, 'manual')
})

test('EGP base: converts to AED via base-anchored rate', () => {
	const r = resolveProductPrice({
		basePrice: 50, baseCurrency: 'EGP', targetCurrency: 'AED',
		rates: { AED: 0.12 },
	})
	assert.equal(r.price, 6)
	assert.equal(r.source, 'converted')
	assert.equal(r.exchangeRate, 0.12)
})

test('decision 2a: base price wins over a manual override in the base currency', () => {
	const r = resolveProductPrice({
		basePrice: 50, baseCurrency: 'EGP', targetCurrency: 'EGP',
		manualPrices: { EGP: 999 },
	})
	assert.equal(r.price, 50)
})

test('buildRateMap filters by the given base currency', () => {
	const map = buildRateMap(
		[
			{ baseCurrency: 'EGP', targetCurrency: 'AED', rate: 0.12 } as any,
			{ baseCurrency: 'AED', targetCurrency: 'USD', rate: 0.27 } as any,
		],
		'EGP',
	)
	assert.deepEqual(map, { AED: 0.12 })
})
```

Add `buildRateMap` to the import at the top of the test file:

```ts
import {
	resolveProductPrice,
	estimateConversion,
	roundPrice,
	buildRateMap,
} from '../lib/pricing/pricingEngine'
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx src/tests/pricingEngine.test.ts`
Expected: FAIL (engine still takes `aedPrice`, `buildRateMap` takes one arg).

- [ ] **Step 3: Update `ResolvedPrice` and `PricingInput` types**

In `src/types/pricing.ts`, replace the `ResolvedPrice` interface:

```ts
export interface ResolvedPrice {
	price: number
	currency: CurrencyCode
	source: PriceSource
	exchangeRate: number | null
	basePrice: number
	baseCurrency: CurrencyCode
	fallbackToBase?: boolean
}
```

- [ ] **Step 4: Rewrite the engine**

Replace `src/lib/pricing/pricingEngine.ts` (drop the `BASE_CURRENCY` import):

```ts
import type {
	CurrencyCode,
	CurrencyRate,
	PriceSource,
	ProductPrice,
	ResolvedPrice,
} from '../../types/pricing'

export interface PricingInput {
	basePrice: number
	baseCurrency: CurrencyCode
	targetCurrency: CurrencyCode
	manualPrices?: Partial<Record<CurrencyCode, number>>
	rates?: Partial<Record<CurrencyCode, number>>
}

export function resolveProductPrice(input: PricingInput): ResolvedPrice {
	const { basePrice, baseCurrency, targetCurrency, manualPrices = {}, rates = {} } = input

	if (targetCurrency === baseCurrency) {
		return { price: basePrice, currency: baseCurrency, source: 'manual', exchangeRate: null, basePrice, baseCurrency }
	}

	const manualPrice = manualPrices[targetCurrency]
	if (manualPrice !== undefined && manualPrice !== null) {
		return { price: manualPrice, currency: targetCurrency, source: 'manual', exchangeRate: null, basePrice, baseCurrency }
	}

	const rate = rates[targetCurrency]
	if (rate === undefined || rate === null) {
		return { price: basePrice, currency: baseCurrency, source: 'manual', exchangeRate: null, basePrice, baseCurrency, fallbackToBase: true }
	}

	const converted = roundPrice(basePrice * rate)
	return { price: converted, currency: targetCurrency, source: 'converted', exchangeRate: rate, basePrice, baseCurrency }
}

export function buildManualPriceMap(
	productPrices: ProductPrice[],
): Partial<Record<CurrencyCode, number>> {
	const map: Partial<Record<CurrencyCode, number>> = {}
	for (const entry of productPrices) {
		if (entry.isManual) map[entry.currencyCode] = entry.price
	}
	return map
}

export function buildRateMap(
	rates: CurrencyRate[],
	baseCurrency: CurrencyCode,
): Partial<Record<CurrencyCode, number>> {
	const map: Partial<Record<CurrencyCode, number>> = {}
	for (const entry of rates) {
		if (entry.baseCurrency === baseCurrency) map[entry.targetCurrency] = entry.rate
	}
	return map
}

export function estimateConversion(
	basePrice: number,
	baseCurrency: CurrencyCode,
	currency: CurrencyCode,
	rate: number | undefined,
): number | null {
	if (currency === baseCurrency) return basePrice
	if (rate === undefined) return null
	return roundPrice(basePrice * rate)
}

export function roundPrice(value: number): number {
	return Math.round(value * 100) / 100
}

export function getPriceSourceLabel(
	source: PriceSource,
	fallbackToBase?: boolean,
): 'manual' | 'converted' | 'fallback' {
	if (fallbackToBase) return 'fallback'
	return source
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx tsx src/tests/pricingEngine.test.ts`
Expected: all pass. (The existing AED tests pass too: `targetCurrency: 'AED'` with no `baseCurrency` — update those existing cases to add `baseCurrency: 'AED'` and rename `aedPrice` → `basePrice` if they fail.)

- [ ] **Step 6: Commit**

```bash
git add src/types/pricing.ts src/lib/pricing/pricingEngine.ts src/tests/pricingEngine.test.ts
git commit -m "feat(pricing): parameterize pricing engine by base currency"
```

---

## Task 3: Rename `aedPrice`→`basePrice` across consumers

The engine/types now use `basePrice`/`baseCurrency`/`fallbackToBase`. Update every consumer so the project type-checks. **No behavior change yet** — `baseCurrency` will be wired from the store in Task 7; for now pass `BASE_CURRENCY`.

**Files (from `grep aedPrice|fallbackToAed`):** `src/components/PriceDisplay.tsx`, `src/components/ProductListPrice.tsx`, `src/components/CartPriceLabel.tsx`, `src/hooks/usePricing.ts`, `src/lib/pricing/cartHelpers.ts`, `src/store/cartStore.ts`, `src/pages/Home.tsx`, `src/pages/Products.tsx`, `src/pages/ProductView.tsx`, `src/pages/CategoryView.tsx`, `src/pages/admin/Pricing.tsx`, `src/lib/pricing/productPriceService.ts`.

- [ ] **Step 1: Update `usePricing.ts`**

Replace the three engine-calling functions in `src/hooks/usePricing.ts` (keep `BASE_CURRENCY` import for now):

```ts
import { BASE_CURRENCY } from '../lib/pricing/constants'
// ...
	const rateMap = useMemo(() => buildRateMap(rates, BASE_CURRENCY), [rates])
// ...
export function useResolvedPrice(
	productId: string,
	basePrice: number,
	currency?: CurrencyCode,
): ResolvedPrice {
	const selectedCurrency = useCurrencyStore((s) => s.currency)
	const targetCurrency = currency ?? selectedCurrency
	const { rateMap } = useCurrencyRates()
	const { pricesByProduct } = useProductPricesCache()

	return useMemo(() => {
		const productPrices = pricesByProduct.get(productId) ?? []
		const manualPrices = buildManualPriceMap(productPrices)
		return resolveProductPrice({ basePrice, baseCurrency: BASE_CURRENCY, targetCurrency, manualPrices, rates: rateMap })
	}, [productId, basePrice, targetCurrency, pricesByProduct, rateMap])
}
// ...
export function resolvePriceForProduct(
	productId: string,
	basePrice: number,
	currency: CurrencyCode,
	pricesByProduct: Map<string, ProductPrice[]>,
	rateMap: Partial<Record<CurrencyCode, number>>,
): ResolvedPrice {
	const productPrices = pricesByProduct.get(productId) ?? []
	const manualPrices = buildManualPriceMap(productPrices)
	return resolveProductPrice({ basePrice, baseCurrency: BASE_CURRENCY, targetCurrency: currency, manualPrices, rates: rateMap })
}
```

- [ ] **Step 2: Update `PriceDisplay.tsx` field reads**

In `src/components/PriceDisplay.tsx`: change `resolved.fallbackToAed` → `resolved.fallbackToBase`, the indicator key `'price_fallback_aed'` stays as the i18n key, and the secondary reference:

```tsx
{resolved.source === 'converted' && !resolved.fallbackToBase && (
	<> ({formatPrice(resolved.basePrice, resolved.baseCurrency)})</>
)}
```

- [ ] **Step 3: Rename prop `aedPrice`→`basePrice` in components + call sites**

In `src/components/ProductListPrice.tsx` and `src/components/CartPriceLabel.tsx`, rename the `aedPrice` prop to `basePrice`. Update call sites in `Home.tsx`, `Products.tsx`, `ProductView.tsx`, `CategoryView.tsx`: `aedPrice={product.price}` → `basePrice={product.price}`.

In `src/lib/pricing/cartHelpers.ts` and `src/store/cartStore.ts`: rename any `aedPrice` argument/field passed into `resolvePriceForProduct`/`resolveProductPrice` to `basePrice`, and replace any `resolved.aedPrice`→`resolved.basePrice`, `resolved.fallbackToAed`→`resolved.fallbackToBase`.

In `src/lib/pricing/productPriceService.ts`: `saveProductPricing(productId, aedPrice, ...)` — rename the param to `basePrice` and keep `saveProductPrice(productId, BASE_CURRENCY, basePrice, true)`.

- [ ] **Step 4: Type-check**

Run: `npm run lint`
Expected: no errors referencing `aedPrice` / `fallbackToAed`. Fix any stragglers the compiler reports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(pricing): rename aedPrice→basePrice across consumers"
```

---

## Task 4: Base-parameterized rate service

**Files:**
- Modify: `src/lib/pricing/currencyService.ts`

- [ ] **Step 1: Parameterize the provider fetch by base**

In `src/lib/pricing/currencyService.ts`, replace `fetchRatesFromProvider` and the API constants usage. The fawazahmed0 API exposes any base at `…/currencies/{base}.json` with the rates under `data[base]`:

```ts
export async function fetchRatesFromProvider(base: CurrencyCode): Promise<{
	rates: Record<string, number>
	provider: string
	date: string
}> {
	const code = base.toLowerCase()
	const endpoints = [
		{ url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`, provider: 'jsdelivr' },
		{ url: `https://latest.currency-api.pages.dev/v1/currencies/${code}.json`, provider: 'pages.dev' },
	]
	let lastError: Error | null = null
	for (const endpoint of endpoints) {
		try {
			const response = await fetch(endpoint.url)
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const data = (await response.json()) as { date?: string } & Record<string, Record<string, number>>
			const rates = data[code]
			if (!rates) throw new Error(`Invalid API response: missing ${code} rates`)
			return { rates, provider: endpoint.provider, date: data.date ?? new Date().toISOString().slice(0, 10) }
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err))
		}
	}
	throw lastError ?? new Error('All exchange rate providers failed')
}
```

- [ ] **Step 2: Parameterize `syncExchangeRates` by base**

Replace the `syncExchangeRates` signature/body to anchor on `base`:

```ts
export async function syncExchangeRates(base: CurrencyCode): Promise<SyncResult> {
	const now = Date.now()
	try {
		const { rates, provider } = await fetchRatesFromProvider(base)
		const existing = await getRatesPayload()
		const rateRows = [...existing.rates]
		let updated = 0
		for (const currency of SUPPORTED_CURRENCIES) {
			if (currency === base) continue
			const rate = rates[currency.toLowerCase()]
			if (rate === undefined) continue
			const row = { baseCurrency: base, targetCurrency: currency, rate, provider, syncedAt: now, createdAt: now, updatedAt: now }
			const idx = rateRows.findIndex((r) => r.baseCurrency === base && r.targetCurrency === currency)
			if (idx >= 0) rateRows[idx] = { ...rateRows[idx], ...row }
			else rateRows.push(row)
			updated++
		}
		await saveRatesPayload({ rates: rateRows, syncMeta: { lastSyncAt: now, provider, status: 'success' } })
		return { success: true, provider, ratesUpdated: updated, syncedAt: now }
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		const existing = await getRatesPayload().catch(() => ({ rates: [], syncMeta: { lastSyncAt: null, provider: null, status: null } }))
		await saveRatesPayload({ ...existing, syncMeta: { lastSyncAt: now, provider: null, status: 'failed', error: message } }).catch(() => {})
		return { success: false, provider: null, ratesUpdated: 0, syncedAt: now, error: message }
	}
}
```

Remove the now-unused `CURRENCY_API_PRIMARY`/`CURRENCY_API_FALLBACK`/`BASE_CURRENCY` imports and the `FawazApiResponse` interface. In `getRateForCurrency(target)`, drop the `target === BASE_CURRENCY` early return (callers now resolve base via the store) — return the matching stored row regardless of base, or keep a `base` parameter: `getRateForCurrency(target, base)` filtering `r.baseCurrency === base`.

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: clean. Update the one caller of `syncExchangeRates` (admin Pricing — handled in Task 8) to pass a base; for now it will error there, which Task 8 resolves. If you need green between tasks, temporarily pass `BASE_CURRENCY` at the call site.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pricing/currencyService.ts
git commit -m "feat(pricing): base-parameterized exchange-rate sync"
```

---

## Task 5: Server base-currency validator

**Files:**
- Modify: `server/src/services/currencySettings.ts`
- Test: `server/src/services/currencySettings.test.ts`

- [ ] **Step 1: Add failing tests**

In `server/src/services/currencySettings.test.ts`, add:

```ts
import { normalizeBaseCurrency, DEFAULT_BASE_CURRENCY } from './currencySettings.js'

describe('normalizeBaseCurrency', () => {
	it('accepts a supported currency', () => {
		expect(normalizeBaseCurrency({ base: 'EGP' })).toEqual({ base: 'EGP' })
	})
	it('rejects an unknown currency', () => {
		expect(() => normalizeBaseCurrency({ base: 'GBP' })).toThrow()
	})
	it('rejects a missing base', () => {
		expect(() => normalizeBaseCurrency({})).toThrow()
	})
	it('default base is AED', () => {
		expect(DEFAULT_BASE_CURRENCY).toBe('AED')
	})
})
```

- [ ] **Step 2: Run to verify it fails**

Run (in `server/`): `npm test`
Expected: FAIL (`normalizeBaseCurrency` not exported).

- [ ] **Step 3: Implement**

Append to `server/src/services/currencySettings.ts`:

```ts
export interface BaseCurrencySetting {
  base: CurrencyCode;
}

export const DEFAULT_BASE_CURRENCY: CurrencyCode = "AED";

export function normalizeBaseCurrency(input: unknown): BaseCurrencySetting {
  const raw = (input ?? {}) as Partial<BaseCurrencySetting>;
  const base = raw.base as CurrencyCode | undefined;
  if (!base || !MASTER_CURRENCIES.includes(base)) {
    throw new CurrencySettingsValidationError("`base` must be a supported currency.");
  }
  return { base };
}
```

- [ ] **Step 4: Run to verify it passes**

Run (in `server/`): `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/currencySettings.ts server/src/services/currencySettings.test.ts
git commit -m "feat(server): base-currency setting validator"
```

---

## Task 6: Server base-currency routes

**Files:**
- Modify: `server/src/routes/catalog.routes.ts`
- Modify: `server/src/routes/admin.routes.ts`

- [ ] **Step 1: Public GET**

In `server/src/routes/catalog.routes.ts`, near the `GET /settings/currency` handler, add (import `DEFAULT_BASE_CURRENCY` from `../services/currencySettings.js`):

```ts
router.get("/settings/base-currency", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "base_currency" } });
    const value = (setting?.value as { base?: string } | undefined) ?? {};
    return res.json({ base: value.base ?? DEFAULT_BASE_CURRENCY });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch base currency." });
  }
});
```

- [ ] **Step 2: Admin PUT**

In `server/src/routes/admin.routes.ts`, alongside `PUT /settings/currency`, add (import `normalizeBaseCurrency` from `../services/currencySettings.js`; `CurrencySettingsValidationError` is already imported):

```ts
router.put("/settings/base-currency", async (req: Request, res: Response) => {
  try {
    const value = normalizeBaseCurrency(req.body);
    await prisma.setting.upsert({
      where: { id: "base_currency" },
      update: { value: value as any },
      create: { id: "base_currency", value: value as any },
    });
    return res.json(value);
  } catch (error: any) {
    const isValidation = error instanceof CurrencySettingsValidationError;
    return res.status(isValidation ? 400 : 500).json({
      error: error.message || "Failed to save base currency.",
    });
  }
});
```

- [ ] **Step 3: Type-check the server**

Run (in `server/`): `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Manual smoke**

Run the server, then:
```bash
curl -s localhost:5000/api/settings/base-currency
```
Expected: `{"base":"AED"}`.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/catalog.routes.ts server/src/routes/admin.routes.ts
git commit -m "feat(server): base-currency GET/PUT settings routes"
```

---

## Task 7: Client base-currency store + wiring

**Files:**
- Create: `src/store/baseCurrencyStore.ts`
- Modify: `src/main.tsx`
- Modify: `src/hooks/usePricing.ts`
- Modify: `src/components/PriceDisplay.tsx`, `ProductListPrice.tsx`, `CartPriceLabel.tsx` (pass language to `formatPrice`)

- [ ] **Step 1: Create the store**

Create `src/store/baseCurrencyStore.ts`:

```ts
import { create } from 'zustand'
import type { CurrencyCode } from '../types/pricing'
import { BASE_CURRENCY } from '../lib/pricing/constants'
import { apiFetch } from '../lib/api/client'

interface BaseCurrencyState {
	baseCurrency: CurrencyCode
	loaded: boolean
}

export const useBaseCurrencyStore = create<BaseCurrencyState>()(() => ({
	baseCurrency: BASE_CURRENCY,
	loaded: false,
}))

export function getBaseCurrencySnapshot(): CurrencyCode {
	return useBaseCurrencyStore.getState().baseCurrency
}

export async function loadBaseCurrency(): Promise<void> {
	try {
		const { base } = await apiFetch<{ base: CurrencyCode }>('/api/settings/base-currency')
		useBaseCurrencyStore.setState({ baseCurrency: base, loaded: true })
	} catch {
		useBaseCurrencyStore.setState({ loaded: true })
	}
}

export async function saveBaseCurrency(base: CurrencyCode): Promise<void> {
	await apiFetch('/api/admin/settings/base-currency', {
		method: 'PUT',
		auth: true,
		body: JSON.stringify({ base }),
	})
	useBaseCurrencyStore.setState({ baseCurrency: base })
}
```

- [ ] **Step 2: Bootstrap at app init**

In `src/main.tsx`, after the imports add `import { loadBaseCurrency } from "./store/baseCurrencyStore";` and call it before the currency-settings load:

```tsx
void loadBaseCurrency();
```

- [ ] **Step 3: Thread the active base into the engine**

In `src/hooks/usePricing.ts`, replace the `BASE_CURRENCY` usages with the live base from the store:

```ts
import { useBaseCurrencyStore } from '../store/baseCurrencyStore'
// in useCurrencyRates():
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)
	const rateMap = useMemo(() => buildRateMap(rates, baseCurrency), [rates, baseCurrency])
// in useResolvedPrice(): read baseCurrency from the store and pass it
	const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)
	// ...resolveProductPrice({ basePrice, baseCurrency, targetCurrency, manualPrices, rates: rateMap })
```

For `resolvePriceForProduct` (non-hook), read the snapshot: `import { getBaseCurrencySnapshot } from '../store/baseCurrencyStore'` and use `baseCurrency: getBaseCurrencySnapshot()`.

- [ ] **Step 4: Pass language to `formatPrice` in display components**

In `PriceDisplay.tsx`, `ProductListPrice.tsx`, `CartPriceLabel.tsx`: use `const { i18n } = useTranslation()` and pass `i18n.language === 'ar' ? 'ar' : 'en'` as the 3rd arg to every `formatPrice(...)` call. (`PriceDisplay` already has `useTranslation`.)

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(pricing): client base-currency store wired into pricing + labels"
```

---

## Task 8: Admin Pricing page — base-currency selector

**Files:**
- Modify: `src/pages/admin/Pricing.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add i18n keys**

In `src/i18n.ts`, add to both `ar` and `en` translation blocks:

ar:
```ts
base_currency: "العملة الأساسية",
base_currency_desc: "العملة التي تُسعّر بها المنتجات وتُحتسب منها أسعار الصرف.",
base_currency_switch_note: "سيُعاد تفسير الأسعار الأساسية بالعملة الجديدة وتحديث أسعار الصرف.",
base_currency_saved: "تم تحديث العملة الأساسية",
base_currency_save_failed: "فشل تحديث العملة الأساسية",
```

en:
```ts
base_currency: "Base Currency",
base_currency_desc: "The currency products are priced in and exchange rates are anchored to.",
base_currency_switch_note: "Base prices will be re-interpreted in the new currency and rates re-synced.",
base_currency_saved: "Base currency updated",
base_currency_save_failed: "Failed to update base currency",
```

- [ ] **Step 2: Render a base-currency selector**

At the top of the Pricing page content (above the Currency Rates section) in `src/pages/admin/Pricing.tsx`, add a selector bound to the store. Import:

```ts
import { useBaseCurrencyStore, saveBaseCurrency } from '../../store/baseCurrencyStore'
import { syncExchangeRates } from '../../lib/pricing/currencyService'
import { SUPPORTED_CURRENCIES } from '../../lib/pricing/constants'
import type { CurrencyCode } from '../../types/pricing'
```

Component logic + JSX:

```tsx
const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency)

async function handleBaseChange(next: CurrencyCode) {
	if (next === baseCurrency) return
	if (!window.confirm(t('base_currency_switch_note'))) return
	try {
		await saveBaseCurrency(next)
		await syncExchangeRates(next)   // re-anchor rates to the new base
		toast.success(t('base_currency_saved'))
		// refresh rates/prices view (re-run the page's existing loaders)
	} catch {
		toast.error(t('base_currency_save_failed'))
	}
}
```

```tsx
<section>
	<h2>{t('base_currency')}</h2>
	<p>{t('base_currency_desc')}</p>
	<select value={baseCurrency} onChange={(e) => handleBaseChange(e.target.value as CurrencyCode)}>
		{SUPPORTED_CURRENCIES.map((c) => (
			<option key={c} value={c}>{c}</option>
		))}
	</select>
</section>
```

- [ ] **Step 3: Make the product-price base field label dynamic**

In the product-price editor section of `Pricing.tsx`, where it currently labels the base/AED price field with `t('aed_price')`, render `` `${baseCurrency} ${t('price')}` `` (or interpolate) so the label tracks the active base. Ensure any `syncExchangeRates()` call elsewhere on the page passes `baseCurrency`.

- [ ] **Step 4: Type-check + manual UI check**

Run: `npm run lint` → clean.
Manual: start app + server, open Admin → Pricing, switch base AED→EGP, confirm: toast success, rates re-sync, storefront product shows base price at face value in EGP (e.g. a product with `price = 50` shows `50.00 EGP`), other currencies convert from EGP.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Pricing.tsx src/i18n.ts
git commit -m "feat(admin): base-currency selector on Pricing page"
```

---

## Final verification

- [ ] `npm run lint` (root) → clean.
- [ ] `cd server && npx tsc --noEmit && npm test` → clean + green.
- [ ] `npx tsx src/tests/pricingEngine.test.ts` and `npx tsx src/tests/formatPrice.test.ts` → pass.
- [ ] Manual: base switch AED→EGP reflects on storefront after reload; EGP renders as `EGP` (en) / `ج م` (ar); a product with a manual EGP override still shows its base price for EGP (decision 2a).

## Notes for Phase 2 (separate plan)

The change/audit log is **not** in this plan. When built, the natural hook points are the admin mutation routes (`PUT /settings/base-currency`, `PUT /settings/currency`, `PUT /pricing/rates`, `PUT|DELETE /pricing/product-prices`, product CRUD), each writing an `AuditLog` row with actor, entity, and old→new value.
