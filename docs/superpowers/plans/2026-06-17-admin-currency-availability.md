# Admin Currency Availability & Default Currency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin choose, from the Pricing page, which currencies the storefront offers and which currency new visitors see by default — without changing the AED pricing base.

**Architecture:** A new `Setting` row (`currency_settings = { enabled, default }`) is read publicly and written by admin, mirroring the existing `theme` settings pattern. The storefront reads it through a new `currencySettingsStore`; the currency selector and visitor-default logic filter to the enabled set. The fixed master list (AED, USD, EGP, SAR, EUR) and rate/price-editing scope are unchanged.

**Tech Stack:** Express + Prisma (server, Vitest), React + Zustand + i18next (client, tsx/`node:assert` tests like `src/tests/pricingEngine.test.ts`).

**Spec:** [docs/superpowers/specs/2026-06-17-admin-currency-availability-design.md](../specs/2026-06-17-admin-currency-availability-design.md)

---

## File Structure

**Server**
- Create `server/src/services/currencySettings.ts` — master list, defaults, pure `normalizeCurrencySettings()` validator.
- Create `server/src/services/currencySettings.test.ts` — Vitest tests for the validator.
- Modify `server/src/routes/catalog.routes.ts` — public `GET /settings/currency`.
- Modify `server/src/routes/admin.routes.ts` — admin `PUT /settings/currency`.

**Client**
- Modify `src/types/pricing.ts` — `CurrencySettings` interface.
- Create `src/lib/pricing/currencyAvailability.ts` — defaults + pure resolution helpers.
- Create `src/tests/currencyAvailability.test.ts` — tsx/assert tests.
- Modify `src/lib/api/catalog.ts` — `getCurrencySettings()`.
- Modify `src/lib/api/admin.ts` — `updateCurrencySettings()`.
- Create `src/store/currencySettingsStore.ts` — Zustand store + loader.
- Modify `src/store/currencyStore.ts` — validate/resolve against enabled set.
- Modify `src/components/CurrencySelector.tsx` — render enabled currencies.
- Modify `src/main.tsx` — load currency settings at init.
- Modify `src/pages/admin/Pricing.tsx` — "Currency Availability" admin section.
- Modify `src/i18n.ts` — new en/ar keys.

---

## Task 1: Server validator (`normalizeCurrencySettings`)

**Files:**
- Create: `server/src/services/currencySettings.ts`
- Test: `server/src/services/currencySettings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/services/currencySettings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_SETTINGS,
  MASTER_CURRENCIES,
  normalizeCurrencySettings,
} from "./currencySettings.js";

describe("normalizeCurrencySettings", () => {
  it("accepts a valid payload unchanged", () => {
    const result = normalizeCurrencySettings({ enabled: ["AED", "USD"], default: "USD" });
    expect(result).toEqual({ enabled: ["AED", "USD"], default: "USD" });
  });

  it("drops entries not in the master list", () => {
    const result = normalizeCurrencySettings({ enabled: ["AED", "XYZ", "EUR"], default: "EUR" });
    expect(result.enabled).toEqual(["AED", "EUR"]);
  });

  it("dedupes and preserves master order", () => {
    const result = normalizeCurrencySettings({ enabled: ["EUR", "AED", "EUR"], default: "AED" });
    expect(result.enabled).toEqual(["AED", "EUR"]);
  });

  it("throws when enabled is empty after filtering", () => {
    expect(() => normalizeCurrencySettings({ enabled: ["XYZ"], default: "XYZ" })).toThrow(
      /at least one/i,
    );
  });

  it("throws when default is not in enabled", () => {
    expect(() => normalizeCurrencySettings({ enabled: ["AED", "USD"], default: "EUR" })).toThrow(
      /default/i,
    );
  });

  it("throws when enabled is not an array", () => {
    expect(() => normalizeCurrencySettings({ default: "AED" } as never)).toThrow(/enabled/i);
  });

  it("exposes the fixed master list and defaults", () => {
    expect(MASTER_CURRENCIES).toEqual(["AED", "USD", "EGP", "SAR", "EUR"]);
    expect(DEFAULT_CURRENCY_SETTINGS).toEqual({
      enabled: ["AED", "USD", "EGP", "SAR", "EUR"],
      default: "AED",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --prefix server -- currencySettings`
Expected: FAIL — cannot find module `./currencySettings.js`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/services/currencySettings.ts`:

```ts
export type CurrencyCode = "AED" | "USD" | "EGP" | "SAR" | "EUR";

export const MASTER_CURRENCIES: CurrencyCode[] = ["AED", "USD", "EGP", "SAR", "EUR"];

export const BASE_CURRENCY: CurrencyCode = "AED";

export interface CurrencySettings {
  enabled: CurrencyCode[];
  default: CurrencyCode;
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  enabled: [...MASTER_CURRENCIES],
  default: BASE_CURRENCY,
};

/**
 * Validate + normalize an incoming currency-settings payload.
 * Throws Error (caller maps to HTTP 400) when the payload is unusable.
 */
export function normalizeCurrencySettings(input: unknown): CurrencySettings {
  const raw = (input ?? {}) as Partial<CurrencySettings>;

  if (!Array.isArray(raw.enabled)) {
    throw new Error("`enabled` must be an array of currency codes.");
  }

  // Filter to master list, dedupe, preserve master order.
  const enabled = MASTER_CURRENCIES.filter((c) => raw.enabled!.includes(c));

  if (enabled.length === 0) {
    throw new Error("At least one currency must be enabled.");
  }

  const def = raw.default as CurrencyCode | undefined;
  if (!def || !enabled.includes(def)) {
    throw new Error("`default` must be one of the enabled currencies.");
  }

  return { enabled, default: def };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --prefix server -- currencySettings`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/currencySettings.ts server/src/services/currencySettings.test.ts
git commit -m "feat(server): add currency-settings validator"
```

---

## Task 2: Server routes (GET public + PUT admin)

**Files:**
- Modify: `server/src/routes/catalog.routes.ts` (after the `GET /pricing/rates` handler, ~line 124)
- Modify: `server/src/routes/admin.routes.ts` (in the Settings section, after the `PUT /settings/theme` handler, ~line 338)

- [ ] **Step 1: Add the public GET route**

In `server/src/routes/catalog.routes.ts`, add the import at the top (next to other imports):

```ts
import { DEFAULT_CURRENCY_SETTINGS } from "../services/currencySettings.js";
```

Then add this handler immediately after the existing `router.get("/pricing/rates", ...)` block:

```ts
/**
 * GET /api/settings/currency — public read for storefront currency availability.
 */
router.get("/settings/currency", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "currency_settings" } });
    const value = (setting?.value as typeof DEFAULT_CURRENCY_SETTINGS | null) ?? DEFAULT_CURRENCY_SETTINGS;
    return res.json(value);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch currency settings." });
  }
});
```

- [ ] **Step 2: Add the admin PUT route**

In `server/src/routes/admin.routes.ts`, add the import at the top (next to other imports):

```ts
import { normalizeCurrencySettings } from "../services/currencySettings.js";
```

Then add this handler immediately after the existing `router.put("/settings/theme", ...)` block:

```ts
router.put("/settings/currency", async (req: Request, res: Response) => {
  try {
    const value = normalizeCurrencySettings(req.body);
    await prisma.setting.upsert({
      where: { id: "currency_settings" },
      update: { value },
      create: { id: "currency_settings", value },
    });
    return res.json(value);
  } catch (error: any) {
    // Validation errors -> 400; anything else -> 500.
    const isValidation = /enabled|default|currency must/i.test(error?.message ?? "");
    return res.status(isValidation ? 400 : 500).json({
      error: error.message || "Failed to save currency settings.",
    });
  }
});
```

- [ ] **Step 3: Verify the server compiles**

Run: `npm run build --prefix server`
Expected: PASS — no TypeScript errors.

- [ ] **Step 4: Manual smoke (optional, requires running server + DB)**

Run (server running on :5000):
```bash
curl -s http://localhost:5000/api/settings/currency
```
Expected: JSON `{"enabled":["AED","USD","EGP","SAR","EUR"],"default":"AED"}` (defaults when unset).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/catalog.routes.ts server/src/routes/admin.routes.ts
git commit -m "feat(server): currency-settings GET/PUT endpoints"
```

---

## Task 3: Client types + pure resolution helpers

**Files:**
- Modify: `src/types/pricing.ts` (after the `CurrencyCode` type, ~line 1)
- Create: `src/lib/pricing/currencyAvailability.ts`
- Test: `src/tests/currencyAvailability.test.ts`

- [ ] **Step 1: Add the `CurrencySettings` type**

In `src/types/pricing.ts`, add after the `CurrencyCode` type definition:

```ts
export interface CurrencySettings {
	enabled: CurrencyCode[]
	default: CurrencyCode
}
```

- [ ] **Step 2: Write the failing test**

Create `src/tests/currencyAvailability.test.ts` (mirrors the tsx/assert style of `src/tests/pricingEngine.test.ts`):

```ts
/**
 * Test: currencyAvailability
 *
 * Run with:  npx tsx src/tests/currencyAvailability.test.ts
 */

import assert from 'node:assert/strict'
import {
	DEFAULT_CURRENCY_SETTINGS,
	reconcilePersistedCurrency,
	resolveInitialCurrency,
	sanitizeCurrencySettings,
} from '../lib/pricing/currencyAvailability'

let passed = 0
let failed = 0

function test(label: string, fn: () => void) {
	try {
		fn()
		console.log(`  ✓  ${label}`)
		passed++
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(`  ✗  ${label}`)
		console.error(`     ${message}`)
		failed++
	}
}

test('defaults enable the full master list with AED default', () => {
	assert.deepEqual(DEFAULT_CURRENCY_SETTINGS.enabled, ['AED', 'USD', 'EGP', 'SAR', 'EUR'])
	assert.equal(DEFAULT_CURRENCY_SETTINGS.default, 'AED')
})

test('sanitize drops unknown currencies and preserves master order', () => {
	const result = sanitizeCurrencySettings({
		enabled: ['EUR', 'AED', 'ZZZ' as never],
		default: 'EUR',
	})
	assert.deepEqual(result.enabled, ['AED', 'EUR'])
	assert.equal(result.default, 'EUR')
})

test('sanitize falls back to defaults when enabled becomes empty', () => {
	const result = sanitizeCurrencySettings({ enabled: [], default: 'USD' })
	assert.deepEqual(result, DEFAULT_CURRENCY_SETTINGS)
})

test('sanitize resets default when it is not enabled', () => {
	const result = sanitizeCurrencySettings({ enabled: ['USD', 'EUR'], default: 'AED' })
	assert.equal(result.default, 'USD') // first enabled
})

test('resolveInitialCurrency keeps detected when enabled', () => {
	const settings = { enabled: ['AED', 'EGP'] as const, default: 'AED' as const }
	assert.equal(resolveInitialCurrency('EGP', settings), 'EGP')
})

test('resolveInitialCurrency falls back to default when detected is disabled', () => {
	const settings = { enabled: ['AED', 'EGP'] as const, default: 'AED' as const }
	assert.equal(resolveInitialCurrency('USD', settings), 'AED')
})

test('reconcilePersistedCurrency keeps enabled, resets disabled', () => {
	const settings = { enabled: ['USD', 'EUR'] as const, default: 'USD' as const }
	assert.equal(reconcilePersistedCurrency('EUR', settings), 'EUR')
	assert.equal(reconcilePersistedCurrency('AED', settings), 'USD')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx src/tests/currencyAvailability.test.ts`
Expected: FAIL — cannot find module `../lib/pricing/currencyAvailability`.

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/pricing/currencyAvailability.ts`:

```ts
import type { CurrencyCode, CurrencySettings } from '../../types/pricing'
import { BASE_CURRENCY, SUPPORTED_CURRENCIES } from './constants'

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
	enabled: [...SUPPORTED_CURRENCIES],
	default: BASE_CURRENCY,
}

/**
 * Defensive client-side normalization: keep only master-list currencies in
 * master order, ensure a non-empty enabled set, and ensure `default` is enabled.
 * Falls back to DEFAULT_CURRENCY_SETTINGS when the input is unusable.
 */
export function sanitizeCurrencySettings(
	raw: Partial<CurrencySettings> | null | undefined,
): CurrencySettings {
	const rawEnabled = Array.isArray(raw?.enabled) ? raw!.enabled : []
	const enabled = SUPPORTED_CURRENCIES.filter((c) => rawEnabled.includes(c))

	if (enabled.length === 0) {
		return { enabled: [...DEFAULT_CURRENCY_SETTINGS.enabled], default: DEFAULT_CURRENCY_SETTINGS.default }
	}

	const def = raw?.default && enabled.includes(raw.default) ? raw.default : enabled[0]
	return { enabled, default: def }
}

/** Pick the currency a brand-new visitor should see. */
export function resolveInitialCurrency(
	detected: CurrencyCode,
	settings: Pick<CurrencySettings, 'enabled' | 'default'>,
): CurrencyCode {
	return settings.enabled.includes(detected) ? detected : settings.default
}

/** Keep a persisted choice if still enabled, otherwise fall back to default. */
export function reconcilePersistedCurrency(
	current: CurrencyCode,
	settings: Pick<CurrencySettings, 'enabled' | 'default'>,
): CurrencyCode {
	return settings.enabled.includes(current) ? current : settings.default
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx src/tests/currencyAvailability.test.ts`
Expected: PASS — `7 passed, 0 failed`.

- [ ] **Step 6: Commit**

```bash
git add src/types/pricing.ts src/lib/pricing/currencyAvailability.ts src/tests/currencyAvailability.test.ts
git commit -m "feat(client): currency availability types and resolution helpers"
```

---

## Task 4: Client API helpers

**Files:**
- Modify: `src/lib/api/catalog.ts` (after `getTheme`, ~line 70)
- Modify: `src/lib/api/admin.ts` (in the Settings section, after `updateTheme`, ~line 104)

- [ ] **Step 1: Add the public getter**

In `src/lib/api/catalog.ts`, add the import near the top (alongside existing type imports):

```ts
import type { CurrencySettings } from "../../types/pricing";
```

Then add after `getTheme`:

```ts
export function getCurrencySettings(): Promise<CurrencySettings> {
  return apiFetch<CurrencySettings>("/api/settings/currency");
}
```

- [ ] **Step 2: Add the admin updater**

In `src/lib/api/admin.ts`, add the import near the top (alongside existing type imports):

```ts
import type { CurrencySettings } from "../../types/pricing";
```

Then add after `updateTheme`:

```ts
export const updateCurrencySettings = (settings: CurrencySettings) =>
  adminFetch<CurrencySettings>("/api/admin/settings/currency", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
```

- [ ] **Step 3: Verify the client type-checks**

Run: `npm run lint`
Expected: PASS — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/catalog.ts src/lib/api/admin.ts
git commit -m "feat(client): currency-settings API helpers"
```

---

## Task 5: `currencySettingsStore` (Zustand)

**Files:**
- Create: `src/store/currencySettingsStore.ts`

- [ ] **Step 1: Create the store**

Create `src/store/currencySettingsStore.ts`:

```ts
import { create } from 'zustand'
import type { CurrencyCode, CurrencySettings } from '../types/pricing'
import { getCurrencySettings } from '../lib/api/catalog'
import {
	DEFAULT_CURRENCY_SETTINGS,
	sanitizeCurrencySettings,
} from '../lib/pricing/currencyAvailability'

interface CurrencySettingsState {
	enabledCurrencies: CurrencyCode[]
	defaultCurrency: CurrencyCode
	loaded: boolean
	setSettings: (settings: CurrencySettings) => void
	load: () => Promise<void>
}

export const useCurrencySettingsStore = create<CurrencySettingsState>()((set) => ({
	enabledCurrencies: [...DEFAULT_CURRENCY_SETTINGS.enabled],
	defaultCurrency: DEFAULT_CURRENCY_SETTINGS.default,
	loaded: false,
	setSettings: (settings) => {
		const clean = sanitizeCurrencySettings(settings)
		set({
			enabledCurrencies: clean.enabled,
			defaultCurrency: clean.default,
			loaded: true,
		})
	},
	load: async () => {
		try {
			const settings = await getCurrencySettings()
			const clean = sanitizeCurrencySettings(settings)
			set({
				enabledCurrencies: clean.enabled,
				defaultCurrency: clean.default,
				loaded: true,
			})
		} catch {
			// Fail open: keep master-list defaults so the storefront stays usable.
			set({ loaded: true })
		}
	},
}))

/** Snapshot helpers for non-React modules (e.g. currencyStore). */
export function getCurrencySettingsSnapshot(): {
	enabled: CurrencyCode[]
	default: CurrencyCode
} {
	const s = useCurrencySettingsStore.getState()
	return { enabled: s.enabledCurrencies, default: s.defaultCurrency }
}
```

- [ ] **Step 2: Verify type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/currencySettingsStore.ts
git commit -m "feat(client): currency settings store with fail-open loader"
```

---

## Task 6: Wire `currencyStore` to the enabled set

**Files:**
- Modify: `src/store/currencyStore.ts`

- [ ] **Step 1: Update the store to use enabled currencies + reconcile**

Replace the contents of `src/store/currencyStore.ts` with:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrencyCode, CurrencyRate } from '../types/pricing'
import { BASE_CURRENCY, CURRENCY_LOCALE_MAP } from '../lib/pricing/constants'
import {
	reconcilePersistedCurrency,
	resolveInitialCurrency,
} from '../lib/pricing/currencyAvailability'
import { getCurrencySettingsSnapshot } from './currencySettingsStore'

interface CurrencyState {
	currency: CurrencyCode
	rates: CurrencyRate[]
	ratesLoaded: boolean
	lastSyncAt: number | null
	setCurrency: (currency: CurrencyCode) => void
	setRates: (rates: CurrencyRate[], lastSyncAt?: number | null) => void
	detectDefaultCurrency: () => CurrencyCode
}

function detectFromBrowser(): CurrencyCode {
	const lang = navigator.language
	if (CURRENCY_LOCALE_MAP[lang]) {
		return CURRENCY_LOCALE_MAP[lang]
	}
	const prefix = lang.split('-')[0]
	if (prefix === 'ar') return 'EGP'
	if (prefix === 'en') return 'AED'
	return BASE_CURRENCY
}

export const useCurrencyStore = create<CurrencyState>()(
	persist(
		(set) => ({
			currency: BASE_CURRENCY,
			rates: [],
			ratesLoaded: false,
			lastSyncAt: null,
			setCurrency: (currency) => {
				const { enabled } = getCurrencySettingsSnapshot()
				if (enabled.includes(currency)) {
					set({ currency })
				}
			},
			setRates: (rates, lastSyncAt = null) => {
				set({ rates, ratesLoaded: true, lastSyncAt })
			},
			detectDefaultCurrency: () =>
				resolveInitialCurrency(detectFromBrowser(), getCurrencySettingsSnapshot()),
		}),
		{
			name: 'jamhawi-currency-storage',
			partialize: (state) => ({ currency: state.currency }),
		},
	),
)

export function initCurrencyPreference(): void {
	const store = useCurrencyStore.getState()
	const stored = localStorage.getItem('jamhawi-currency-storage')
	if (!stored) {
		store.setCurrency(store.detectDefaultCurrency())
	}
}

/**
 * Called after currency settings load: if the persisted/active currency is no
 * longer enabled, move the visitor to the configured default.
 */
export function reconcileCurrencyWithSettings(): void {
	const { setCurrency, currency } = useCurrencyStore.getState()
	const next = reconcilePersistedCurrency(currency, getCurrencySettingsSnapshot())
	if (next !== currency) {
		// setCurrency validates against enabled; `next` is guaranteed enabled.
		setCurrency(next)
	}
}
```

> Note: the old `onRehydrateStorage` guard against `SUPPORTED_CURRENCIES` is removed because enabled-set reconciliation now happens via `reconcileCurrencyWithSettings()` after settings load (the enabled set isn't known at rehydrate time).

- [ ] **Step 2: Verify type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/currencyStore.ts
git commit -m "feat(client): currency store respects enabled currencies + default"
```

---

## Task 7: Load settings at app init

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Load currency settings and reconcile after init**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import {
  initCurrencyPreference,
  reconcileCurrencyWithSettings,
} from "./store/currencyStore";
import { useCurrencySettingsStore } from "./store/currencySettingsStore";

initCurrencyPreference();

// Load admin-configured currency availability, then reconcile the active
// currency against it (fail-open: defaults keep the storefront usable).
void useCurrencySettingsStore
  .getState()
  .load()
  .then(() => reconcileCurrencyWithSettings());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 2: Verify type-check + build**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(client): bootstrap currency settings at app init"
```

---

## Task 8: Storefront selector renders enabled currencies

**Files:**
- Modify: `src/components/CurrencySelector.tsx`

- [ ] **Step 1: Render from the enabled set**

In `src/components/CurrencySelector.tsx`:

Replace the import line:
```ts
import { SUPPORTED_CURRENCIES } from '../lib/pricing/constants'
```
with:
```ts
import { useCurrencySettingsStore } from '../store/currencySettingsStore'
```

Inside the component, after the existing `setCurrency` selector line, add:
```ts
	const enabledCurrencies = useCurrencySettingsStore((s) => s.enabledCurrencies)
```

Replace the `.map` source:
```tsx
				{SUPPORTED_CURRENCIES.map((code) => (
```
with:
```tsx
				{enabledCurrencies.map((code) => (
```

- [ ] **Step 2: Verify type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/CurrencySelector.tsx
git commit -m "feat(client): currency selector shows only enabled currencies"
```

---

## Task 9: i18n keys

**Files:**
- Modify: `src/i18n.ts` (Arabic block ~line 213, English block ~line 610 — next to the existing `currency_rates` keys)

- [ ] **Step 1: Add Arabic keys**

In the `ar.translation` object, after `currency_rates: "أسعار الصرف",` add:

```ts
      currency_availability: "العملات المتاحة",
      currency_availability_desc: "اختر العملات التي تظهر للعملاء والعملة الافتراضية",
      enable_currency: "تفعيل",
      default_currency: "العملة الافتراضية",
      aed_base_note: "يبقى الدرهم الإماراتي (AED) أساس التسعير حتى لو تم إخفاؤه.",
      currency_settings_saved: "تم حفظ إعدادات العملة",
      currency_settings_save_failed: "تعذر حفظ إعدادات العملة",
      at_least_one_currency: "يجب تفعيل عملة واحدة على الأقل",
```

- [ ] **Step 2: Add English keys**

In the `en.translation` object, after `currency_rates: "Currency Rates",` add:

```ts
      currency_availability: "Currency Availability",
      currency_availability_desc: "Choose which currencies customers see and the default currency",
      enable_currency: "Enabled",
      default_currency: "Default Currency",
      aed_base_note: "AED stays the pricing base even when hidden from the storefront.",
      currency_settings_saved: "Currency settings saved",
      currency_settings_save_failed: "Failed to save currency settings",
      at_least_one_currency: "Enable at least one currency",
```

- [ ] **Step 3: Verify type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(i18n): currency availability admin strings (en/ar)"
```

---

## Task 10: Admin "Currency Availability" section

**Files:**
- Modify: `src/pages/admin/Pricing.tsx`

- [ ] **Step 1: Add imports and state**

In `src/pages/admin/Pricing.tsx`, add to the imports:

```ts
import { SUPPORTED_CURRENCIES } from '../../lib/pricing/constants'
import { getCurrencySettings } from '../../lib/api/catalog'
import { updateCurrencySettings } from '../../lib/api/admin'
import { useCurrencySettingsStore } from '../../store/currencySettingsStore'
import type { CurrencySettings } from '../../types/pricing'
```

> `BASE_CURRENCY`, `OPTIONAL_CURRENCIES`, `RATE_STALE_MS` are already imported from constants; add `SUPPORTED_CURRENCIES` to that existing import instead of duplicating if your editor flags a duplicate import.

Inside the `Pricing` component, after the existing `setRates` line (`const setRates = useCurrencyStore((s) => s.setRates)`), add:

```ts
	const applyCurrencySettings = useCurrencySettingsStore((s) => s.setSettings)

	const [enabledSet, setEnabledSet] = useState<Set<CurrencyCode>>(
		new Set(SUPPORTED_CURRENCIES),
	)
	const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(BASE_CURRENCY)
	const [savingCurrency, setSavingCurrency] = useState(false)
```

- [ ] **Step 2: Load existing settings on mount**

Add a new effect next to the existing `useEffect(() => { loadRates() }, [])`:

```ts
	useEffect(() => {
		getCurrencySettings()
			.then((s) => {
				setEnabledSet(new Set(s.enabled))
				setDefaultCurrency(s.default)
			})
			.catch((e) => handleApiError(e, OperationType.GET, 'currency_settings'))
	}, [])
```

- [ ] **Step 3: Add toggle/save handlers**

Add these handlers inside the component (e.g. after `handleRefreshRates`):

```ts
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
```

- [ ] **Step 4: Keep the default valid as toggles change**

Add an effect so disabling the current default auto-moves it to the first enabled currency:

```ts
	useEffect(() => {
		if (!enabledSet.has(defaultCurrency)) {
			const firstEnabled = SUPPORTED_CURRENCIES.find((c) => enabledSet.has(c))
			if (firstEnabled) setDefaultCurrency(firstEnabled)
		}
	}, [enabledSet, defaultCurrency])
```

- [ ] **Step 5: Render the section**

Insert this `<section>` as the first child inside the outer `<div className="p-6 max-w-5xl mx-auto space-y-8">`, immediately after the page header `<div>...</div>` block and **before** the Currency Rates section:

```tsx
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
```

- [ ] **Step 6: Verify type-check + build**

Run: `npm run lint && npm run build`
Expected: PASS — no TypeScript or build errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/Pricing.tsx
git commit -m "feat(admin): currency availability + default currency controls"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run server tests**

Run: `npm test --prefix server`
Expected: PASS — includes the new `currencySettings` suite.

- [ ] **Step 2: Run client helper test**

Run: `npx tsx src/tests/currencyAvailability.test.ts`
Expected: `7 passed, 0 failed`.

- [ ] **Step 3: Type-check + build both**

Run: `npm run lint && npm run build && npm run build --prefix server`
Expected: PASS.

- [ ] **Step 4: Manual end-to-end check (server + client running)**

1. Log in to admin → Pricing. Uncheck a currency (e.g. EUR), set default to USD, Save → success toast.
2. Reload the storefront → currency selector no longer lists EUR; a fresh visitor (clear `jamhawi-currency-storage`) starts on a browser-detected enabled currency or USD.
3. In the browser console set `localStorage['jamhawi-currency-storage']` to the EUR value and reload → confirm the active currency is reset to USD (the default).
Expected: all three behaviors hold.

- [ ] **Step 5: Final commit (if any manual-fix tweaks were needed)**

```bash
git add -A
git commit -m "test: verify currency availability end-to-end"
```

---

## Self-Review Notes

- **Spec coverage:** enable/hide (Tasks 2,8,10) · default selection (Tasks 2,10) · browser-detect-then-default (Task 3 `resolveInitialCurrency`, Task 6) · reset disabled persisted currency (Task 3 `reconcilePersistedCurrency`, Tasks 6–7) · AED hideable but base (Task 1 validator allows it; Task 10 note) · admin editor & rate sync unchanged (no task touches `OPTIONAL_CURRENCIES` price editor or `currencyService` sync) · server validation + fail-open client (Tasks 1,2,5).
- **Type consistency:** `CurrencySettings { enabled, default }` used identically across server (`currencySettings.ts`) and client (`types/pricing.ts`); helper names `sanitizeCurrencySettings` / `resolveInitialCurrency` / `reconcilePersistedCurrency` / `getCurrencySettingsSnapshot` / `reconcileCurrencyWithSettings` are referenced consistently in Tasks 3,5,6,7.
- **No placeholders:** every code step contains complete code.
