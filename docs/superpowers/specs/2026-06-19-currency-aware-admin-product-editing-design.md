# Currency-Aware Admin Product Editing — Design Spec

**Date:** 2026-06-19
**Status:** Approved (pending spec review)
**Branch:** feat/admin-base-currency

## Goal

Make admin product pricing faster to browse and edit:

1. On the **Product Pricing** page, pick a product from a category-filtered list that
   shows product thumbnails (instead of a flat name-only dropdown).
2. On the **Manage Products** page, filter the product table by category (and search
   by name), and edit per-currency prices directly from the product Edit modal via a
   new **Prices** tab — without leaving for the separate Pricing page.

This builds on the existing base-currency + per-currency override model (manual
`product_prices` rows resolved against base-anchored rates).

## Background / Current State

- [`src/pages/admin/Pricing.tsx`](../../../src/pages/admin/Pricing.tsx) has a "Product
  Pricing" section: a flat `<select>` of all products, then a base-price input plus one
  input per optional currency (with auto/manual badge and an estimated conversion).
  Save calls `saveProductPricing(productId, base, manualPrices)` then
  `updateProduct(productId, { price })`.
- [`src/pages/admin/Products.tsx`](../../../src/pages/admin/Products.tsx) lists products
  in a table (already shows a thumbnail + category + a `<ProductPriceCell>` for the
  resolved price). The Edit modal has a single base `price` field; saving writes the
  product and `saveProductPrice(id, BASE_CURRENCY, price, true)`.
- [`src/hooks/usePricing.ts`](../../../src/hooks/usePricing.ts) exposes
  `useCurrencyRates()` (rate map + base currency from the global stores) which a
  self-contained editor can reuse.
- Per-currency persistence lives in
  [`src/lib/pricing/productPriceService.ts`](../../../src/lib/pricing/productPriceService.ts)
  (`getProductPrices`, `saveProductPricing`, `saveProductPrice`, `removeProductPrice`).

## Non-Goals

- No change to the pricing engine, base-currency model, or rate sync.
- No change to the per-currency persistence API or audit logging — all writes continue
  to flow through `saveProductPricing` / `updateProduct`.
- Not fixing the pre-existing `useProductPricesCache` staleness (see Known Limitations).
- No bulk price editing across multiple products at once.

## Architecture

One new shared component owns the per-product pricing editor; both admin surfaces
consume it. The Manage Products table and the Pricing-page picker each gain
category filtering.

```
ProductPricingEditor (new, shared, self-contained)
        ▲                        ▲
        │ showBasePrice=true     │ showBasePrice=false
        │                        │
Pricing.tsx                 Products.tsx (Edit modal "Prices" tab)
(filtered product            (Details tab keeps base price field;
 list + thumbnails)           table gains category filter + search)
```

### Component 1 — `ProductPricingEditor` (new)

**File:** `src/components/admin/ProductPricingEditor.tsx`

Extract the inline per-currency editor from `Pricing.tsx` into one self-contained,
reusable component.

**Props:**

| Prop | Type | Notes |
|------|------|-------|
| `productId` | `string` | Required. The product whose prices are edited. |
| `productBasePrice` | `number` | Fallback base price + context for conversion estimates when no base row exists yet. |
| `showBasePrice` | `boolean` (default `true`) | When `false`, hides the base-price input and edits only per-currency overrides. |
| `onSaved` | `() => void` (optional) | Called after a successful save (parent refreshes its list). |

**Behavior:**

- Sources rates + base currency from `useCurrencyRates()` and `useBaseCurrencyStore`.
- On mount / `productId` change: `getProductPrices(productId)` → seed base-price field
  (from the base-currency row, falling back to `productBasePrice`) and the optional-currency
  manual-price form + `savedManual` set. Same logic currently in `loadProductPricing`.
- Renders:
  - When `showBasePrice`: a base-price input labelled `` `${baseCurrency} ${t('price')}` `` `*`.
  - For each `OPTIONAL_CURRENCIES` code: label + auto/manual badge, a number input, and
    (when blank) the estimated conversion via `estimateConversion(base, baseCurrency, code, rateMap[code])`.
  - Its own **Save** button.
- **Save logic:**
  - When `showBasePrice` is `true`: parse base price (required, ≥ 0), then
    `saveProductPricing(productId, base, parsedManual)` + `updateProduct(productId, { price: base })`.
    This is exactly today's `handleSavePricing`.
  - When `showBasePrice` is `false`: use `productBasePrice` as the base argument so the base
    row stays consistent, and persist only the optional-currency overrides via
    `saveProductPricing`. The base price itself is owned by the Manage Products Details tab.
  - Keep the existing `confirm_zero_price` guard for a `0` override.
  - On success: toast, reload the product's prices, call `onSaved?.()`.

After extraction, `Pricing.tsx` no longer holds `basePrice` / `manualPrices` /
`savedManual` / `loadingProduct` / `saving` state, nor `loadProductPricing` /
`handleSavePricing`.

### Component 2 — Product Pricing page: filtered list with thumbnails

**File:** `src/pages/admin/Pricing.tsx` ("Product Pricing" section only)

- Extend the loaded product shape from `Pick<ApiProduct, 'id'|'name'|'nameAr'|'price'>`
  to also include `image` and `categoryId`.
- Load categories via `listCategories()` (already imported pattern exists in `Products.tsx`).
- Add a **category filter** `<select>` with an "All categories" option
  (`t('all_categories')`).
- Replace the flat product `<select>` with a scrollable, bordered product list. Each row:
  thumbnail (or placeholder), name (+ `nameAr` if present), and the current base price
  (`formatPrice(product.price, baseCurrency, lang)`). The selected row is highlighted;
  clicking sets `selectedProductId`.
- Below the list, render `<ProductPricingEditor productId={selectedProductId}
  productBasePrice={selectedProduct.price} />` (defaults to `showBasePrice=true`).
- The Base-Currency, Currency-Availability, and Currency-Rates sections are unchanged.

### Component 3 — Manage Products: table filter + Edit modal "Prices" tab

**File:** `src/pages/admin/Products.tsx`

**Table filtering:**

- Add `filterCategoryId` state and a `<select>` (with "All categories"), plus a name
  `search` text input, placed in the header row area above the table.
- Derive `filteredProducts` from `products` by category match and case-insensitive name
  / `nameAr` substring match; render `filteredProducts` instead of `products`.

**Edit modal tabs:**

- Add a tab bar inside the modal with two tabs: **Details** (`t('tab_details')`) and
  **Prices** (`t('tab_prices')`). Track `activeTab` state, reset to `Details` on open.
- **Details tab:** the existing form (name EN/AR, base `price`, pricing type, category,
  image, description, stock, available) and its existing single **Save** button. The base
  `price` field remains the source of truth for the base price and for product creation.
- **Prices tab:**
  - When editing an existing product: render `<ProductPricingEditor productId={isEditing}
    productBasePrice={form.price} showBasePrice={false} onSaved={fetchProducts} />`.
    It edits only per-currency overrides; conversion estimates use the live `form.price`.
  - When adding a new product (`isEditing === null`): the Prices tab is disabled and shows
    a hint (`t('save_product_first')`), because overrides require a persisted product id
    and base price.
- Base price is intentionally **not** duplicated in the Prices tab to avoid two
  divergent editable base fields within one open modal.

## Data Flow

1. Admin opens Manage Products → filters by category/search → clicks Edit.
2. Details tab edits product fields + base price; its Save writes the product and the base
   `product_prices` row (unchanged path).
3. Prices tab (existing product) edits per-currency overrides; its Save writes override
   rows via `saveProductPricing` and refetches the product list.
4. On the Pricing page, selecting a product in the filtered thumbnail list mounts
   `ProductPricingEditor`, which loads that product's rows and edits base + overrides.

All writes continue through `saveProductPricing` / `saveProductPrice` / `updateProduct`,
so server-side audit logging is unaffected.

## Error Handling

- Reuse `handleApiError(...)` for loads and `toast.error(...)` for save failures, matching
  current behavior.
- Base price required/≥0 validation and the `confirm_zero_price` guard are preserved in
  `ProductPricingEditor`.
- Category/product loads that fail surface via existing toast/error handling and leave the
  list empty rather than crashing.

## i18n

Add to both `en` and `ar` blocks in [`src/i18n.ts`](../../../src/i18n.ts):

- `tab_details` — "Details" / "التفاصيل"
- `tab_prices` — "Prices" / "الأسعار"
- `filter_by_category` — "Filter by category" / "تصفية حسب الفئة"
- `all_categories` — "All categories" / "كل الفئات"
- `search_products` — "Search products" / "بحث عن المنتجات"
- `save_product_first` — "Save the product first to set per-currency prices." /
  "احفظ المنتج أولاً لتعيين الأسعار لكل عملة."

Reuse existing keys: `product_pricing`, `price`, `optional`, `select_product`,
`price_badge_manual`, `price_badge_auto`, `estimated_price`, `rate_unavailable`,
`leave_empty_convert`, `aed_price_required`, `confirm_zero_price`, `save`, `saving`,
`category`, `loading`.

## Testing

- This is primarily a refactor + UI composition with no pricing-engine change. The
  existing pure-logic tests remain the safety net:
  - `npx tsx src/tests/pricingEngine.test.ts` → pass.
  - `npm run lint` (root, `tsc --noEmit`) → clean.
  - `cd server && npx tsc --noEmit && npm test` → clean + green (no server change expected,
    run to confirm nothing regressed).
- No new pure-logic module is introduced, so no new unit-test file is required.
- Manual verification:
  - Pricing page: filter by category, select a product via thumbnail row, edit base +
    an override, save, confirm toast and reload reflect the change.
  - Manage Products: filter table by category + search; open Edit on an existing product,
    switch to Prices tab, set/clear an override, save, confirm the list refreshes.
  - Add Product: Prices tab is disabled with the "save first" hint.

## Known Limitations (out of scope)

- `useProductPricesCache` loads once; a just-saved override may not reflect in a storefront
  / table `ProductPriceCell` until reload. Refetching the product list refreshes the
  base-price column. Fixing the cache invalidation is deferred.
- The Prices tab and Details tab each have their own Save button (independent saves), by
  design — Details owns the base price, Prices owns the overrides.

## Files Touched

| File | Action |
|------|--------|
| `src/components/admin/ProductPricingEditor.tsx` | Create |
| `src/pages/admin/Pricing.tsx` | Modify (extract editor; add category filter + thumbnail list) |
| `src/pages/admin/Products.tsx` | Modify (table category filter + search; Edit modal tabs + Prices tab) |
| `src/i18n.ts` | Modify (new keys, en + ar) |
