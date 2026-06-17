# Admin Currency Availability & Default Currency — Design

**Date:** 2026-06-17
**Status:** Approved design (pending spec review)

## Summary

Give the admin control, from the Pricing page, over **which currencies the
storefront offers** and **which currency new visitors see by default**. The
fixed master list of supported currencies (AED, USD, EGP, SAR, EUR) and the
AED pricing base are unchanged; this adds a runtime layer that filters what
customers can see and select.

## Goals

- Admin can enable/hide each supported currency from the storefront.
- Admin can choose the default display currency (among enabled currencies).
- Storefront currency selector shows only enabled currencies.
- New visitors land on a sensible currency: browser-detected when that
  currency is enabled, otherwise the admin's default.
- Returning visitors whose stored currency was disabled are reset to default.

## Non-Goals (YAGNI)

- No arbitrary/custom currency creation. The master list stays the fixed 5.
- No change to the pricing base. AED remains the base all prices are stored in
  and all exchange rates are anchored to.
- No change to admin product-price editing or rate-sync coverage — both keep
  operating across all 5 supported currencies so a currency can be fully
  pre-configured before it is enabled.

## Key Decisions

| Decision | Choice |
|----------|--------|
| What "default currency" controls | Default **display** currency for visitors only (not the pricing base). |
| New-visitor selection | Browser-detect filtered to enabled set; fall back to admin default. |
| Hiding AED | Allowed. AED stays the internal base/rate anchor but may be hidden from the storefront selector. |
| Admin editor & rate sync scope | All 5 supported currencies, regardless of public visibility. |

## Data Model

New `Setting` row (same key/value table used by `theme` and `currency_rates`):

- **Key:** `currency_settings`
- **Value:**
  ```ts
  interface CurrencySettings {
    enabled: CurrencyCode[]   // subset of SUPPORTED_CURRENCIES, non-empty
    default: CurrencyCode     // must be a member of `enabled`
  }
  ```
- **Defaults when the row is absent:**
  `{ enabled: SUPPORTED_CURRENCIES, default: BASE_CURRENCY }` (AED).

### Validation (server-side, on write)

1. Drop any entry not in `SUPPORTED_CURRENCIES`.
2. `enabled` must be non-empty after filtering → else `400`.
3. `default` must be a member of `enabled` → else `400`.

The client form enforces the same rules before submitting, but the server is
the source of truth.

## Server

Mirrors the existing `theme` settings pattern.

- `GET /api/settings/currency` (public, in `catalog.routes.ts`)
  → returns the stored `CurrencySettings`, or the defaults if the row is absent.
- `PUT /api/admin/settings/currency` (admin, in `admin.routes.ts`)
  → validates per rules above, upserts the `currency_settings` row, returns the
    saved value.

## Client

### `currencySettingsStore` (new zustand store)

- State: `enabledCurrencies: CurrencyCode[]`, `defaultCurrency: CurrencyCode`,
  `loaded: boolean`.
- Initial state (before fetch): `enabledCurrencies = SUPPORTED_CURRENCIES`,
  `defaultCurrency = BASE_CURRENCY`, `loaded = false`.
- `loadCurrencySettings()` — fetches `GET /api/settings/currency` once at app
  init (alongside the existing currency-rate / theme bootstrapping) and
  populates the store. On failure it keeps the safe master-list defaults.
- `saveCurrencySettings(settings)` — used by the admin page; `PUT`s to the admin
  route and updates the store on success.

### `currencyStore` changes

- `setCurrency(code)` validates against `enabledCurrencies` (from
  `currencySettingsStore`) instead of `SUPPORTED_CURRENCIES`.
- Visitor initial pick (`detectDefaultCurrency` / `initCurrencyPreference`):
  1. Detect from browser language (existing logic).
  2. If detected currency is in `enabledCurrencies`, use it.
  3. Otherwise use `defaultCurrency`.
- Rehydration guard: if a persisted `currency` is not in `enabledCurrencies`,
  reset it to `defaultCurrency`. (The enabled set may not be loaded at
  rehydrate time, so this check also runs after `loadCurrencySettings()`
  resolves.)

### Components

- `CurrencySelector` maps over `enabledCurrencies` instead of
  `SUPPORTED_CURRENCIES`.
- Any other storefront UI listing selectable currencies switches to
  `enabledCurrencies`.
- Admin product-price editor (`Pricing.tsx`) and `currencyService` rate sync
  are **unchanged** — they continue to use `SUPPORTED_CURRENCIES` /
  `OPTIONAL_CURRENCIES`.

## Admin UI — Pricing page

A new **"Currency Availability"** section is added at the top of
[Pricing.tsx](src/pages/admin/Pricing.tsx) (above "Currency Rates"):

- One row per master-list currency with an **enable/hide** checkbox. AED is
  toggleable like the others (a small note clarifies AED remains the pricing
  base even if hidden).
- A **default currency** selector (radio or `<select>`) limited to currently
  enabled currencies. Disabling the currency that is currently the default
  forces a new default to be chosen (or auto-selects the first enabled one).
- A **Save** button that calls `saveCurrencySettings`. Client-side guards:
  at least one currency enabled; default must be enabled. Success/error via the
  existing `toast` pattern.

New i18n keys (en + ar) for: section title, "default currency", the AED-base
note, and validation/toast messages.

## Data Flow

1. App init → `loadCurrencySettings()` populates `currencySettingsStore`.
2. `CurrencySelector` renders only `enabledCurrencies`; storefront initial
   currency resolved via the browser-detect-then-default rule.
3. Admin edits availability/default in Pricing → `PUT /api/admin/settings/currency`
   → store updates → selector and defaults reflect the change on next load.

## Error Handling

- Server validation returns `400` with a message on invalid payloads.
- Client fetch failure for settings → keep master-list defaults, storefront
  stays fully functional (fail-open, never strands a user with no currencies).
- Save failure → toast error, form state preserved.

## Testing

- **Server unit tests:** validation (non-master entries dropped, empty
  `enabled` rejected, `default` not in `enabled` rejected), GET returns defaults
  when row absent, PUT round-trips a valid payload.
- **Client unit tests:** `currencyStore.setCurrency` rejects disabled
  currencies; visitor-default resolution (detected-enabled vs. fallback);
  rehydration reset when persisted currency is disabled.
- **Manual/UI check:** hide a currency in admin → confirm it disappears from
  the storefront selector and a visitor on a disabled currency is moved to the
  default.
