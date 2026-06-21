# Configurable Product Weights — Design Spec

**Date:** 2026-06-21
**Branch:** feat/admin-base-currency
**Status:** Approved (brainstorming) → ready for implementation plan

## Summary

Today every product shows the same hardcoded global weight list
(`['500g','1kg','2kg','3kg']`) and each weight's price is `product.price`
(treated as price-per-kg) × a fixed multiplier. There is no way for an admin to
choose which weights a product offers, no way to override a single weight's
price, and the default-selected weight is hardcoded to `1kg`.

This feature makes weights **per-product configurable** from the admin Pricing
tab:

- Admin toggles (checkboxes) which weights are visible for each product.
- Admin sets the **2kg anchor price**; the other weights auto-calculate
  linearly from it.
- Admin can override any individual weight's price (base currency only);
  clearing the override reverts it to auto-calculated.
- The storefront renders only the product's visible weights and defaults the
  selection to **2kg**.

Scope: this spec covers **weights only**. Region/visit analytics is a separate
feature with its own spec.

## Decisions (from brainstorming)

- **Weight set:** fixed master list with per-product visibility toggles (no
  arbitrary custom weight values).
- **Auto-calc:** linear by weight from the 2kg anchor.
- **Overrides:** per-weight overrides are entered in the **base currency only**;
  other currencies convert from base via existing rates.
- **Applies to:** **all products** get the weight selector (not just `per_kg`).
- **Storage:** JSON blob in the `Setting` table (Approach A), mirroring the
  existing `product_prices` / `currency_rates` pattern. No DB migration.

## Master weight list

Replace the current master list with:

```
WEIGHT_OPTIONS    = ['500g', '1kg', '2kg', '5kg']   // was [..., '3kg']
WEIGHT_MULTIPLIERS = { '500g': 0.5, '1kg': 1, '2kg': 2, '5kg': 5 }  // kg
ANCHOR_WEIGHT      = '2kg'
DEFAULT_VISIBLE    = ['500g', '1kg', '2kg', '5kg']  // all four
```

- `WeightOption` type changes from `'500g'|'1kg'|'2kg'|'3kg'` to
  `'500g'|'1kg'|'2kg'|'5kg'`.
- Dropping `3kg` is safe for historical data: cart items and order items
  snapshot the weight **string** at purchase time and never re-resolve it.

## Per-product weight config

Stored as a single `Setting` row, id = `product_weights`:

```jsonc
{
  "configs": [
    {
      "productId": "uuid",
      "visibleWeights": ["500g", "1kg", "2kg", "5kg"],
      "weightOverrides": { "5kg": 120 }   // base-currency absolute prices
    }
  ]
}
```

- A product with **no config row** behaves as: `visibleWeights = DEFAULT_VISIBLE`,
  `weightOverrides = {}` (pure auto-calc). No backfill/migration needed.
- `visibleWeights` must contain **at least one** weight. The editor enforces
  this; the resolver also defends against an empty list by falling back to
  `DEFAULT_VISIBLE`.
- `weightOverrides` keys are a subset of the master list; values are absolute
  base-currency prices. Absence of a key = auto-calculated.
- The **2kg anchor price is NOT stored here.** It is the product's existing base
  price (the `BASE_CURRENCY` entry in `product_prices`, kept in sync with
  `product.price`), exactly as `ProductPricingEditor` saves it today.

## Price resolution

For a `(product, weight W, currency C)` the customer-facing price is resolved in
two layers:

### Layer 1 — base-currency price for the weight

```
anchorBase = product base price (2kg price, base currency)
kg(W)      = WEIGHT_MULTIPLIERS[W]

baseWeightPrice(W) =
    weightOverrides[W]              if present
    roundPrice(anchorBase * kg(W) / 2)   otherwise   // linear from 2kg anchor
```

Examples for `anchorBase = 100`: 500g = 25, 1kg = 50, 2kg = 100, 5kg = 250.

### Layer 2 — convert to target currency

Feed `baseWeightPrice(W)` into the existing pricing engine
(`resolveProductPrice`):

- `C == base` → `baseWeightPrice(W)`.
- A **per-currency manual product override** exists for C → that override is
  reinterpreted as the **2kg-anchor price in currency C** and scaled linearly:
  `roundPrice(override * kg(W) / 2)`. (Documented rule — see note below.)
- Otherwise → convert `baseWeightPrice(W)` via the stored rate; if no rate, fall
  back to showing the base-currency amount (existing behavior).

**Override-interaction rule (§3.3):** per-weight overrides live in the base
currency only. When an admin has also set a whole-product **per-currency** manual
override, that per-currency value is treated as the 2kg anchor *in that currency*
and weights scale linearly from it; in that currency, base-currency per-weight
overrides are not applied. This is an accepted, rare edge case and is documented
so behavior is predictable. (Without this rule the current engine would return
the per-currency override as a single weight-agnostic absolute number — a
pre-existing quirk this rule resolves.)

This logic is implemented as a thin **weight-aware resolver** that wraps the
existing `resolveProductPrice` rather than changing its core signature.

## Admin UI — Pricing tab (`ProductPricingEditor`)

Add a **"Weights"** block to the existing editor (which already handles base
price + per-currency overrides), so everything saves on one Save action.

Per master weight (500g / 1kg / 2kg / 5kg):

- **Visibility checkbox** — toggles membership in `visibleWeights`. At least one
  must remain checked (enforce in UI).
- **Price input:**
  - **2kg row** is the **anchor**, visually highlighted; its value is the
    product base price field (the existing base-price input, relabeled/grouped
    here). Editing it re-derives all auto-calculated rows.
  - Other rows show the **auto-calculated** price as the input placeholder.
    Typing a value sets `weightOverrides[W]`; clearing the field removes the
    override and reverts to auto. A small "auto"/"manual" badge mirrors the
    existing per-currency badge styling.

Save writes:
1. base price → `product_prices[BASE_CURRENCY]` + `product.price` (unchanged).
2. per-currency overrides → `product_prices` (unchanged).
3. `visibleWeights` + `weightOverrides` → `product_weights` Setting.

## Storefront (`ProductView`)

- Render chips for **`visibleWeights`** only (resolved from `product_weights`,
  defaulting to all four when absent) instead of the global `WEIGHT_OPTIONS`.
- Default the selected weight to **2kg**; if 2kg is hidden, select the first
  visible weight.
- Each chip's displayed price and the add-to-cart unit price use the weight-aware
  resolver (replacing the current `calculateAedUnitPrice` + `useResolvedPrice`
  for weighted display).
- Add-to-cart snapshot (`buildCartItem`) is unchanged — it already snapshots the
  selected weight and resolved price.

## API / server

Follow the existing `product_prices` route pattern in `admin.routes.ts` /
`catalog.routes.ts`:

- `GET  /api/pricing/product-weights` (optional `?productId=`) — public read,
  used by storefront + admin load.
- `PUT  /api/admin/pricing/product-weights` — auth; upserts one product's config
  into the `product_weights` Setting blob; `recordAudit({ entity:
  "product_weights", ... })`.

A client service (`productWeightService.ts`) mirrors `productPriceService.ts`
(get all / get by product / save one). A `useProductWeightsCache` hook mirrors
`useProductPricesCache` for the storefront.

## Testing

- **Resolver unit tests** (extend `weightPricing.test.ts` /
  `pricingEngine.test.ts`):
  - linear auto-calc for each weight from a 2kg anchor;
  - override wins over auto-calc;
  - hidden-weight handling + empty-`visibleWeights` fallback to defaults;
  - currency scaling: base conversion via rate, and the §3.3 per-currency anchor
    scaling rule;
  - `roundPrice` applied consistently.
- **Service/route test** for `product_weights` mirroring the `product_prices`
  test shape (upsert merges by `productId`, audit recorded).

## Out of scope

- Arbitrary custom weight values (only the fixed master list is toggleable).
- Per-currency-per-weight override matrix.
- Region/visit analytics (separate spec).
- Retroactive repricing of historical orders (snapshots are immutable).
