# Shop Category Landing + Breadcrumbs — Design

**Date:** 2026-06-26
**Branch:** feat/admin-base-currency
**Status:** Approved (pending spec review)

## Goal

1. Make `/shop` land on the category grid (the existing `Categories.tsx`) instead of the old `Home.tsx` landing.
2. Retire the old `Home.tsx` page.
3. Add consistent, correct breadcrumbs across the storefront via a shared component.

## Current state

- `/shop` (index) → `Home.tsx` — an older light-themed landing (hero + category grid + all-products feed). Uses legacy white/stone styling, not the dark "Artisanal Noir" theme.
- `/shop/categories` (and `/categories`) → `Categories.tsx` — polished dark-themed grid of category cards.
- `/shop/category/:id` (and `/category/:id`) → `CategoryView.tsx` — single-category product listing (dark theme).
- `/shop/products` (and `/products`) → `Products.tsx` — all-products feed.
- Breadcrumbs exist only in `ProductView.tsx`, hardcoded `Home › Products › [Category] › Product`, with bugs:
  - "Home" links to `/` (the landing2 redirect), not the shop.
  - "Products" is plain text, not a link.
  - Category links to `/category/:id` rather than `/shop/category/:id`.
- There are two parallel route trees mounting the same children: `/shop/*` and bare `/*`. Both resolve. `/shop` is treated as canonical.

## Changes

### 1. Routing (`src/App.tsx`)

- Change the `/shop` index element from `<Home />` to `<Categories />`.
- Remove the `Home` import and delete `src/pages/Home.tsx`.
- Replace the `/shop/categories` child route with a redirect to `/shop` (`<Navigate to="/shop" replace />`) so existing links keep working without rendering a duplicate page. Leave the bare `/categories` route pointing at `<Categories />` (harmless), or likewise redirect to `/shop` — implementer's choice, default: redirect both `categories` children to `/shop`.
- Leave the rest of the route structure (including the parallel bare-`/` tree) untouched.

The all-products feed remains available at `/shop/products` (`Products.tsx`) — the "All Products" buttons in `Categories.tsx` and `CategoryView.tsx` already point there.

### 2. Shared breadcrumb component (`src/components/Breadcrumbs.tsx`)

A small presentational component — the single source of breadcrumb markup and styling.

**API:**
```ts
interface Crumb {
  label: string;   // already-resolved display text (i18n/RTL handled by caller)
  to?: string;     // omit on the last/current crumb
}
function Breadcrumbs({ items }: { items: Crumb[] }): JSX.Element
```

**Behavior:**
- Renders crumbs joined by `ChevronRight` (lucide-react, size 12) separators.
- Items with `to` render as react-router `<Link>`; the final item (no `to`) renders as a non-link "current" span.
- Styling uses the existing `--th-*` theme tokens (matching ProductView's current `.anp-breadcrumb` look: muted text, gold hover, gold "current"), so it works in both dark and light themes.
- Accessibility: wrapping `<nav aria-label="Breadcrumb">`; current crumb gets `aria-current="page"`.
- Renders nothing if `items` has fewer than 1 entry (defensive).

The component is purely presentational — it receives resolved labels and does no data fetching. Each page builds its own `items` array, because the pages already hold the resolved category/product names.

### 3. Per-page breadcrumb wiring

First crumb is always `Home → /landing2`. Catalog pages add `Categories → /shop`. Labels are translated (en/ar) by the calling page.

| Page | Crumbs |
|------|--------|
| `Categories.tsx` (`/shop`) | `Home` → `Categories` (current) |
| `CategoryView.tsx` | `Home` → `Categories` → `[Category]` (current) |
| `ProductView.tsx` | `Home` → `Categories` → `[Category]` → `[Product]` (current) — replaces existing hardcoded breadcrumb |
| `Products.tsx` | `Home` → `Categories` → `All Products` (current) |
| `Cart.tsx` | `Home` → `Cart` (current) |
| `Checkout.tsx` | `Home` → `Cart` → `Checkout` (current) |
| `ContactUs.tsx` | `Home` → `Contact` (current) |

Notes:
- "Categories" parent appears only in the catalog chain (Categories/CategoryView/Product/Products), where the hierarchy is real. Cart/Checkout/Contact are not children of Categories, so they chain directly off `Home`.
- `Home → /landing2`, `Categories → /shop`. All catalog deep-links use the `/shop/...` prefix.
- Placement: the `<Breadcrumbs>` row is rendered at the top of each page's content container. For the full-bleed dark pages (Categories, CategoryView, ProductView) it goes *inside* the `*-root` element (after the negative-margin breakout, above the page header) so layout is preserved.

### 4. i18n

Add/reuse translation keys for crumb labels: `breadcrumb_home`, `breadcrumb_categories`, `breadcrumb_all_products`, `breadcrumb_cart`, `breadcrumb_checkout`, `breadcrumb_contact` (en + ar). Existing keys (`products`, etc.) may be reused where they fit. Category and product names come from already-fetched data.

## Out of scope

- Rewriting the parallel bare-`/` route tree or unifying all inter-page links to the `/shop` prefix (pre-existing inconsistency).
- Visual redesign of Categories/CategoryView/Products beyond adding the breadcrumb row.
- Migrating any of Home.tsx's hero/marketing content (it is retired; the marketing landing is `/landing2`).

## Testing / verification

- `/shop` renders the Categories grid; `/shop/categories` and `/categories` redirect to `/shop`.
- No remaining imports/references to `Home.tsx`; `tsc` passes (no unused-import or missing-module errors).
- Each listed page shows the correct breadcrumb chain; every linked crumb navigates to the intended `/shop`-prefixed (or `/landing2`) route; the current crumb is not a link.
- Breadcrumbs render correctly in both dark and light themes and in Arabic.
- Manual click-through: Home → Categories → category → product, using breadcrumbs to navigate back up.
```
