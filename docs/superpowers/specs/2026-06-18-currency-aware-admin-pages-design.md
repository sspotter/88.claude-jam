# Currency-Aware Admin Pages — Design

**Date:** 2026-06-18
**Status:** Approved design

## Summary

Make the admin pages display monetary values in the **admin-selected currency**
instead of the raw base number. Reuses the storefront's existing pricing pipeline
(`useResolvedPrice`, `formatPrice`, the rate map, the selected-currency store).

Scope: **Manage Products**, **Inventory Management**, and **Customers**
("Total Spent" + per-order totals). Plus a currency selector in the admin header.

## Decisions

| Decision | Choice |
|----------|--------|
| Admin currency source | Add the existing `CurrencySelector` to the admin header; it drives the shared, persisted `useCurrencyStore` (same store the storefront uses). |
| Product price cells | Resolve via `useResolvedPrice(productId, basePrice)` — honors per-currency manual overrides + rate + base-fallback (shows the real customer price). |
| Money totals (Total Spent, revenue, order totals) | Convert the stored base amount at the **current** rate via `estimateConversion`; base-fallback if no rate. (Historical totals reflect today's rates — accepted.) |

## Components

### Admin currency selector
- Render `src/components/CurrencySelector.tsx` in the `AdminLayout` header
  (`src/components/AdminLayout.tsx`), beside the existing language toggle.
- It uses `useCurrencyStore`/`currencySettingsStore`, already global. Switching
  re-renders all admin pages. Rates are lazy-loaded by `useCurrencyRates()` on
  first use; base currency is bootstrapped in `main.tsx` (Phase 1).

### `useAmountFormatter()` — new hook in `src/hooks/usePricing.ts`
- Returns `format(baseAmount: number): string`.
- Reads selected currency (`useCurrencyStore`), active base (`useBaseCurrencyStore`),
  the rate map (`useCurrencyRates`), and the active language (`useTranslation`).
- Converts: `estimateConversion(baseAmount, baseCurrency, currency, rateMap[currency])`;
  if the result is `null` (no rate), fall back to the base amount in the base
  currency. Formats with `formatPrice(value, displayCurrency, lang)`.
- For pure money totals that are not tied to a single product (no manual overrides).

### Page edits
- **`src/pages/admin/Products.tsx`**
  - Row price cell (≈ line 401): replace `{prod.price} {t("currency")}` with the
    resolved price. Use `useResolvedPrice(prod.id, prod.price)` via a tiny inline
    cell component (one `useResolvedPrice` call per row — extract a
    `ProductPriceCell` component so the hook isn't called in a loop in the parent),
    then `formatPrice(resolved.price, resolved.currency, lang)`.
  - Revenue (≈ line 722): `useAmountFormatter().format(performanceData.totalRevenue)`.
- **`src/pages/admin/Inventory.tsx`**
  - Row price cell (≈ line 116): same `ProductPriceCell` approach as Products.
- **`src/pages/admin/Customers.tsx`**
  - Total Spent (≈ line 143): `format(customer.totalSpent)`.
  - Order total (≈ line 219): `format(order.totalPrice)`.

`ProductPriceCell` (productId + basePrice → resolved formatted price) is a small
shared component (e.g. `src/components/ProductPriceCell.tsx`) reused by Products
and Inventory, so the per-row hook call is isolated and DRY.

## Out of Scope / Unchanged

- The product **edit form** price input stays base-currency entry (admin types the
  base price; saved via `saveProductPrice(BASE_CURRENCY, …)`).
- Analytics/Dashboard charts and the low-stock notification string are not part of
  this change.
- No server changes. Stored amounts (order totals, `totalSpent`, `product.price`)
  remain base-currency; only display converts.

## Error Handling

- Missing rate for the selected currency → base-fallback (show the base amount in
  the base currency), consistent with the storefront engine's `fallbackToBase`.
- Rates not yet loaded → `useResolvedPrice`/`useAmountFormatter` return the base
  amount until the rate map resolves, then re-render.

## Testing

- **Unit:** add a case to `src/tests/pricingEngine.test.ts` confirming
  `estimateConversion` converts a base amount at a rate and returns `null` when the
  rate is absent (the seam `useAmountFormatter` relies on).
- **Manual:** switch currency in the admin header → Manage Products prices,
  Inventory prices, Customers Total Spent, product revenue, and per-order totals
  all update; with a product that has a manual override, its Products/Inventory
  cell shows the override.
