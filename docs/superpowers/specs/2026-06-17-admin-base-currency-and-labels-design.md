# Admin-Selectable Base Currency + Currency Labels — Design (Phase 1)

**Date:** 2026-06-17
**Status:** Approved design (pending spec review)

## Summary

Let the admin choose the **base currency** the whole pricing system is anchored
to (default AED). Today `BASE_CURRENCY = 'AED'` is a hardcoded constant: product
base prices are stored as AED, exchange rates are AED-anchored, and the rate API
is AED-specific. This makes the base a runtime setting so that, for example,
selecting EGP means a base price of `50` is `50 EGP`, and all other currencies
convert from EGP. Also adds consistent per-currency display labels
(English `EGP`, Arabic `ج م`, etc.).

A separate **Phase 2** spec covers the change/audit log; it is out of scope here.

## Goals

- Admin selects the base currency from the Pricing page; default is AED.
- A base price is a single currency-agnostic number, displayed at face value in
  the active base currency (base = EGP, base price 50 → `50 EGP`).
- Exchange rates and the rate API re-anchor to the selected base.
- Other currencies convert from the base, unless the product has a manual
  per-currency override (override wins for that currency).
- Admin pricing UI reflects the active base dynamically (field label, rates box).
- Storefront reflects base-currency, rate, and price changes after reload.
- Currency amounts render with explicit labels per language for all 5 currencies.

## Non-Goals (YAGNI)

- No change/audit log (Phase 2).
- No new currencies — the master list stays the fixed 5 (AED, USD, EGP, SAR, EUR).
- No multi-base storage of product prices — there is exactly one active base at a
  time; switching re-tags base prices at face value.
- No change to the existing currency-availability / default-display-currency
  feature (`currency_settings`); base currency is a separate setting.

## Key Decisions

| Decision | Choice |
|----------|--------|
| Base-price semantics on base switch | **Face value** — the base price is `product.price` (a currency-agnostic number); switching base just re-interprets it (50 AED → 50 EGP). No data migration. |
| Rate re-anchoring on base switch | Auto re-sync rates for the new base immediately after the base is saved. |
| Manual override in the new base currency on switch | **(a) Base price wins** — enforced structurally: `resolveProductPrice` returns the base price when `target === base`, before checking manual overrides. No row deletion needed. |
| Rate API | fawazahmed0 API parameterized by base: `…/currencies/{base}.json`, read `data[base]`. |
| Display labels | Explicit `{ en, ar }` label per currency; `formatPrice` appends the label instead of relying on `Intl` symbol output. |

## Data Model

### New `Setting` row (mirrors `theme` / `currency_settings`)

- **Key:** `base_currency`
- **Value:** `{ base: CurrencyCode }`
- **Default when absent:** `{ base: "AED" }`

### Product base price (clarified model)

The base price is `product.price` — a plain `Float` on the product, passed into
the pricing engine (today as the `aedPrice` argument). It is **currency-agnostic**:
its unit is whatever the active base currency is. Per-currency manual overrides
are the `product_prices` setting rows (`{ productId, currencyCode, price,
isManual }`).

**On base switch (e.g. AED → EGP): no data migration.**
- `product.price` is unchanged and simply re-interpreted in the new base (50 → 50
  EGP). The engine reads it via the active base.
- "Base price wins for the base currency" (decision 2a) is **structural**:
  `resolveProductPrice` returns `basePrice` when `target === baseCurrency`, before
  it ever looks at the manual-override map. So a pre-existing manual override in
  the new base currency is ignored automatically — nothing is deleted.
- The previous base currency's manual rows (e.g. the AED rows
  `saveProductPricing` wrote) simply remain as manual overrides for that now-
  non-base currency, which is the desired behavior.

The base-currency PUT therefore only needs to validate + upsert the setting; it
does **not** rewrite `product_prices`.

## Server

### `base_currency` setting

- `GET /api/settings/base-currency` (public, `catalog.routes.ts`)
  → `{ base }` from the row, or `{ base: "AED" }` if absent.
- `PUT /api/admin/settings/base-currency` (admin, `admin.routes.ts`)
  → validate `base ∈ MASTER_CURRENCIES` (else `400`); upsert the `base_currency`
    row; return `{ base }`. No `product_prices` rewrite (see model above).

### `currencySettings.ts` (server)

- Keep `MASTER_CURRENCIES`. Add `DEFAULT_BASE_CURRENCY = "AED"` and a
  `normalizeBaseCurrency(input): { base }` validator that throws the existing
  `CurrencySettingsValidationError` on an unknown code.

### Rate storage

Rate rows already carry `baseCurrency`. Pricing reads only rows whose
`baseCurrency === activeBase`. Rows for other bases may remain in storage
harmlessly. No schema change.

## Client

### `pricingEngine.ts` (remove the hardcoded base)

- `resolveProductPrice({ basePrice, baseCurrency, targetCurrency, manualPrices, rates })`:
  - `target === baseCurrency` → `{ price: basePrice, source: 'manual', exchangeRate: null }`.
  - else manual override present → that price.
  - else rate present → `basePrice × rate`.
  - else → fall back to base price (flagged `fallbackToBase`).
- `buildRateMap(rates, baseCurrency)` filters `baseCurrency === <param>`.
- `estimateConversion(basePrice, baseCurrency, currency, rate)` updated likewise.
- The `aedPrice` field in `PricingInput` / `ResolvedPrice` is renamed to
  `basePrice` (and `fallbackToAed` → `fallbackToBase`) across the pricing module
  and its consumers.

### `currencyService.ts` (base-parameterized sync)

- `fetchRatesFromProvider(base)` → URL `…/currencies/${base}.json`, read
  `data[base.toLowerCase()]`.
- `syncExchangeRates(base)` writes rows with `baseCurrency = base` for every other
  supported currency.
- `getRateForCurrency`, `getStoredRates` read against the active base.

### `baseCurrencyStore` (new zustand store)

- State: `baseCurrency: CurrencyCode` (init `AED`), `loaded: boolean`.
- `loadBaseCurrency()` — `GET /api/settings/base-currency` at app init, alongside
  the existing currency-settings/rate/theme bootstrap. On failure keeps `AED`.
- `setBaseCurrency(base)` — admin action: `PUT`, then re-sync rates and refresh
  product prices; update the store on success.
- A `getBaseCurrencySnapshot()` accessor for non-React reads (mirrors
  `getCurrencySettingsSnapshot`).

### `constants.ts`

`BASE_CURRENCY` stays as the **default** seed only. Runtime base comes from the
store. `CURRENCY_LOCALE_MAP` unchanged.

### `usePricing.ts` / price components

Thread the active `baseCurrency` from `baseCurrencyStore` into
`resolveProductPrice` / `buildRateMap`. Components affected:
`PriceDisplay`, `ProductListPrice`, `CartPriceLabel`, and any cart/checkout
totals that resolve prices.

## Display Labels

New `CURRENCY_LABELS: Record<CurrencyCode, { en: string; ar: string }>`:

| Code | en | ar |
|------|----|----|
| AED | AED | د.إ |
| USD | USD | $ |
| EGP | EGP | ج م |
| SAR | SAR | ر.س |
| EUR | EUR | € |

`formatPrice(amount, currency, lang)` formats the number with
`Intl.NumberFormat` (decimal style, 2dp) and appends the language-appropriate
label (e.g. `50.00 EGP` / `50.00 ج م`). Callers pass the active i18n language.
The legacy `currency` i18n key is reconciled to match (en `EGP`, ar `ج م`) so the
two stay consistent. (Final label glyphs for non-EGP currencies may be tuned in
implementation; the contract is "explicit per-language label, not Intl symbol".)

## Admin UI — Pricing page

A new **Base Currency** section at the top of [Pricing.tsx](src/pages/admin/Pricing.tsx)
(above "Currency Rates"):

- A `<select>` of `MASTER_CURRENCIES` bound to the active base.
- Changing it opens a confirm dialog explaining base prices will be re-interpreted
  at face value and rates re-synced. On confirm → `setBaseCurrency(base)` →
  `PUT` → auto `syncExchangeRates(base)` → refetch product prices → toast.
- The product-price editor's base field label is dynamic (`{base} Price`), and the
  Currency Rates box shows `base → target` for the active base.

New i18n keys (en + ar): section title, the face-value/confirm note, and
success/error toasts.

## Data Flow

1. App init → `loadBaseCurrency()` + existing currency-settings/rate bootstrap.
2. Storefront resolves each price via `resolveProductPrice` using the active base,
   the product's base price + manual overrides, and base-anchored rates.
3. Admin changes base in Pricing → server re-tags base prices + validates →
   client re-syncs rates and refetches prices → storefront reflects on reload.

## Error Handling

- Invalid base code → `400` from the PUT; admin UI shows the error toast, base
  unchanged.
- Rate API failure during post-switch sync → base change still persists; rates
  keep their last values and the existing stale-rate warning surfaces; admin can
  retry "Refresh Rates".
- Public base-currency fetch failure on the storefront → keep `AED` default; the
  store fails open so pricing always renders.

## Testing

- **pricingEngine unit tests:** `resolveProductPrice` and `buildRateMap` with a
  non-AED base (base=EGP: base currency at face value; convert to AED/USD via
  base-anchored rate; manual override wins; missing-rate fallback).
- **Server unit tests:** `normalizeBaseCurrency` validation (unknown code →
  throws; valid code passes through); GET returns `{ base: "AED" }` default when
  the row is absent.
- **Engine test for decision 2a:** `resolveProductPrice` returns the base price
  for `target === baseCurrency` even when a manual override exists for that
  currency.
- **formatPrice unit tests:** label output per language (en `EGP`, ar `ج م`).
- **Client unit tests:** `baseCurrencyStore` load/default; `currencyService`
  builds the correct `{base}.json` URL and stores base-anchored rows.
- **Manual/UI check:** switch base AED→EGP in admin → base prices show face value
  in EGP on the storefront, other currencies convert from EGP, a product with a
  pre-existing manual EGP price has it dropped in favor of the base price.
