# Shop Category Landing + Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/shop` land on the existing Categories grid, retire the old `Home.tsx`, and add a shared breadcrumb component across the storefront.

**Architecture:** A single presentational `Breadcrumbs` component (`{ label, to? }[]`) styled with the existing `--th-*` theme tokens. Each page builds its own crumb array (so already-resolved category/product names are reused). Routing change in `App.tsx` swaps the `/shop` index element and redirects the now-redundant `categories` routes.

**Tech Stack:** React 19, react-router-dom 7, react-i18next, lucide-react, TypeScript (Vite). No component-test infra (jsdom/RTL) exists in this repo — existing tests under `src/tests/` are pure-logic Vitest tests only. Per the project's established pattern, the automated gate for this UI work is `npm run lint` (`tsc --noEmit`) plus a final manual browser verification; we are **not** introducing RTL/jsdom just for this feature.

> **Note on `tsc`:** `tsconfig.json` does not set `noUnusedLocals`, so a leftover unused import will not fail the build. Still remove dead imports for cleanliness where the plan says to.

---

## File Structure

- **Create:** `src/components/Breadcrumbs.tsx` — the shared breadcrumb component (only responsibility: render a crumb list).
- **Modify:** `src/App.tsx` — route changes (index → Categories, redirect `categories` routes), remove `Home` import.
- **Delete:** `src/pages/Home.tsx` — retired landing.
- **Modify:** `src/i18n.ts` — add `contact` key (en + ar).
- **Modify (wire breadcrumb):** `src/pages/Categories.tsx`, `src/pages/CategoryView.tsx`, `src/pages/ProductView.tsx` (replace existing hardcoded breadcrumb), `src/pages/Products.tsx`, `src/pages/Cart.tsx`, `src/pages/Checkout.tsx`, `src/pages/ContactUs.tsx`.

Crumb chains (first crumb `Home → /landing2`; catalog pages add `Categories → /shop`):

| Page | Crumbs |
|------|--------|
| Categories (`/shop`) | Home → Categories(current) |
| CategoryView | Home → Categories → [Category](current) |
| ProductView | Home → Categories → [Category] → [Product](current) |
| Products | Home → Categories → All Products(current) |
| Cart | Home → Cart(current) |
| Checkout | Home → Cart → Checkout(current) |
| ContactUs | Home → Contact(current) |

---

## Task 1: Routing — `/shop` lands on Categories, retire Home

**Files:**
- Modify: `src/App.tsx` (lines 16, 97, 105, 121)
- Delete: `src/pages/Home.tsx`

- [ ] **Step 1: Remove the Home import**

In `src/App.tsx`, delete this line (line 16):

```tsx
import Home from "./pages/Home";
```

(`Categories` is already imported on line 25; `Navigate` is already imported from `react-router-dom` on line 5.)

- [ ] **Step 2: Point the `/shop` index at Categories**

In the `/shop` route's `children` array, change the index route (line 97) from:

```tsx
{ index: true, element: <Home /> },
```

to:

```tsx
{ index: true, element: <Categories /> },
```

- [ ] **Step 3: Redirect the redundant `categories` routes to `/shop`**

There are two `{ path: "categories", element: <Categories /> }` entries — one in the `/shop` children (line 105) and one in the bare `/` children (line 121). Change **both** to:

```tsx
{ path: "categories", element: <Navigate to="/shop" replace /> },
```

- [ ] **Step 4: Delete the retired Home page**

```bash
git rm src/pages/Home.tsx
```

- [ ] **Step 5: Type-check**

Run: `npm run lint`
Expected: PASS (no errors). Specifically, no "Cannot find module './pages/Home'" and no unused/missing references.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(shop): land /shop on Categories grid, retire Home page"
```

---

## Task 2: Add the `contact` i18n key

**Files:**
- Modify: `src/i18n.ts`

All other crumb labels already have keys: `home`, `categories`, `all_products`, `cart`, `checkout`. Only `contact` is missing.

- [ ] **Step 1: Add the Arabic key**

In `src/i18n.ts`, inside the `ar.translation` object, add (place it right after the `search_products` line near the end of the `ar` block, before the closing `},`):

```ts
      contact: "تواصل معنا",
```

- [ ] **Step 2: Add the English key**

Inside the `en.translation` object, add (right after the `search_products` line near the end of the `en` block, before the closing `},`):

```ts
      contact: "Contact",
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(i18n): add contact breadcrumb label (en + ar)"
```

---

## Task 3: Create the shared `Breadcrumbs` component

**Files:**
- Create: `src/components/Breadcrumbs.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/Breadcrumbs.tsx` with exactly this content:

```tsx
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  /** Already-resolved display text (caller handles i18n / RTL). */
  label: string;
  /** Omit on the final (current) crumb. */
  to?: string;
}

/**
 * Presentational breadcrumb trail. Styled with the shared `--th-*` theme
 * tokens so it adapts to both the dark and light storefront themes.
 * The final item always renders as the non-link "current" crumb.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items || items.length === 0) return null;

  return (
    <>
      <style>{`
        .bc-nav {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
          font-size: 0.78rem; color: var(--th-muted, #a0a0a0);
          margin-bottom: 2rem;
        }
        .bc-nav a {
          color: var(--th-muted, #a0a0a0); text-decoration: none;
          transition: color 200ms ease;
        }
        .bc-nav a:hover { color: var(--th-gold, #f2ca50); }
        .bc-item { display: inline-flex; align-items: center; gap: 0.4rem; }
        .bc-sep { display: inline-flex; color: var(--th-outline, #4d4635); }
        .bc-current { color: var(--th-text-variant, #d0c5af); font-weight: 600; }
      `}</style>
      <nav className="bc-nav" aria-label="Breadcrumb">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="bc-item">
              {i > 0 && (
                <span className="bc-sep">
                  <ChevronRight size={12} />
                </span>
              )}
              {item.to && !isLast ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span className="bc-current" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Breadcrumbs.tsx
git commit -m "feat(shop): add shared Breadcrumbs component"
```

---

## Task 4: Wire breadcrumbs into the catalog pages

**Files:**
- Modify: `src/pages/Categories.tsx`
- Modify: `src/pages/CategoryView.tsx`
- Modify: `src/pages/ProductView.tsx`
- Modify: `src/pages/Products.tsx`

- [ ] **Step 1: Categories.tsx — import + expose `t`**

The current hook destructure (line 52) is `const { i18n } = useTranslation();`. Change it to also pull `t`:

```tsx
  const { t, i18n } = useTranslation();
```

Add the import near the other imports at the top of the file (after the existing `motion` import on line 6):

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

- [ ] **Step 2: Categories.tsx — render the breadcrumb**

Find the opening of the page container (line 318): `<div className="cats-root">`. Insert the breadcrumb as its first child, immediately after that opening tag and before the `{/* ── Header ── */}` comment:

```tsx
      <div className="cats-root">

        <Breadcrumbs
          items={[
            { label: t("home"), to: "/landing2" },
            { label: t("categories") },
          ]}
        />

        {/* ── Header ── */}
```

- [ ] **Step 3: CategoryView.tsx — import**

`const { t, i18n } = useTranslation();` already exists (line 32). Add the import after the `ProductListPrice` import (line 10):

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

- [ ] **Step 4: CategoryView.tsx — render the breadcrumb**

Find the opening container (line 342): `<div className="anc-root">`. `displayCatName` is already computed (line 91). Insert the breadcrumb as the first child, before the `{/* header */}` comment:

```tsx
      <div className="anc-root">
        <Breadcrumbs
          items={[
            { label: t("home"), to: "/landing2" },
            { label: t("categories"), to: "/shop" },
            { label: displayCatName || t("products") },
          ]}
        />
        {/* header */}
```

- [ ] **Step 5: ProductView.tsx — import**

`const { t, i18n } = useTranslation();` already exists (line 22). `ChevronRight` is already imported (line 7) and is used elsewhere in this file — leave that import as-is. Add the new import after the `ProductListPrice` import (line 11):

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

- [ ] **Step 6: ProductView.tsx — replace the hardcoded breadcrumb**

Replace the existing `<nav className="anp-breadcrumb">` block (lines 463–476) entirely. `categoryName`, `product.categoryId`, and `productName` are already available in scope. New block:

```tsx
          {/* Breadcrumb */}
          <Breadcrumbs
            items={[
              { label: t("home"), to: "/landing2" },
              { label: t("categories"), to: "/shop" },
              ...(categoryName
                ? [{ label: categoryName, to: `/shop/category/${product.categoryId}` }]
                : []),
              { label: productName },
            ]}
          />
```

The old `.anp-breadcrumb` CSS in this file's `<style>` block can remain (harmless, unused) or be deleted — leave it to avoid an unrelated diff.

- [ ] **Step 7: Products.tsx — import**

`const { t, i18n } = useTranslation();` already exists (line 38). Add the import after the `ProductListPrice` import (line 10):

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

- [ ] **Step 8: Products.tsx — render the breadcrumb**

Find the opening container (line 485): `<div className="anp2-root">`. Insert the breadcrumb as its first child, before the `<div className="anp2-title-row">` (line 487):

```tsx
      <div className="anp2-root">

        <Breadcrumbs
          items={[
            { label: t("home"), to: "/landing2" },
            { label: t("categories"), to: "/shop" },
            { label: t("all_products") },
          ]}
        />

        <div className="anp2-title-row">
```

- [ ] **Step 9: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/pages/Categories.tsx src/pages/CategoryView.tsx src/pages/ProductView.tsx src/pages/Products.tsx
git commit -m "feat(shop): add breadcrumbs to catalog pages"
```

---

## Task 5: Wire breadcrumbs into the utility pages

**Files:**
- Modify: `src/pages/Cart.tsx`
- Modify: `src/pages/Checkout.tsx`
- Modify: `src/pages/ContactUs.tsx`

- [ ] **Step 1: Cart.tsx — import**

`const { t } = useTranslation();` already exists (line 16). Add the import near the other component imports at the top of the file:

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

- [ ] **Step 2: Cart.tsx — render the breadcrumb (populated cart)**

In the main (populated) return, find `<div className="cart-inner">` (line 367). Insert the breadcrumb as its first child, before `<h1 className="cart-title">` (line 368):

```tsx
        <div className="cart-inner">
          <Breadcrumbs
            items={[
              { label: t("home"), to: "/landing2" },
              { label: t("cart") },
            ]}
          />
          <h1 className="cart-title">
```

(The empty-cart hero state at `.cart-empty-root` is a centered call-to-action and is intentionally left without a breadcrumb.)

- [ ] **Step 3: Checkout.tsx — import**

`const { t, i18n } = useTranslation();` already exists (line 14). Add the import near the top component imports:

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

- [ ] **Step 4: Checkout.tsx — render the breadcrumb**

Find the outermost return container (line 92): `<div className="max-w-xl mx-auto py-6">`. Insert the breadcrumb as its first child, before `<div className="bg-white rounded-3xl ...">` (line 93):

```tsx
    <div className="max-w-xl mx-auto py-6">
      <Breadcrumbs
        items={[
          { label: t("home"), to: "/landing2" },
          { label: t("cart"), to: "/shop/cart" },
          { label: t("checkout") },
        ]}
      />
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 sm:p-8">
```

- [ ] **Step 5: ContactUs.tsx — import + expose `t`**

Add the import near the top of the file:

```tsx
import Breadcrumbs from "../components/Breadcrumbs";
```

Ensure `t` is available from `useTranslation()`. If the component does not already call `useTranslation`, add at the top of the component body:

```tsx
  const { t } = useTranslation();
```

and ensure `import { useTranslation } from "react-i18next";` is present. (If `t` is already destructured, skip this.)

- [ ] **Step 6: ContactUs.tsx — render the breadcrumb**

The root container `<div className="ctc-root" ...>` opens at line 22 and contains an inline `<style>` block (starting line 35). Insert the breadcrumb as the **first rendered element inside `.ctc-root`, immediately after the `</style>` closing tag** of that block (so it renders above the contact content):

```tsx
        <Breadcrumbs
          items={[
            { label: t("home"), to: "/landing2" },
            { label: t("contact") },
          ]}
        />
```

- [ ] **Step 7: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Cart.tsx src/pages/Checkout.tsx src/pages/ContactUs.tsx
git commit -m "feat(shop): add breadcrumbs to cart, checkout, and contact pages"
```

---

## Task 6: Build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or bundling errors, and no reference to the deleted `Home` module.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
The web app serves on `http://localhost:3007`. (The server workspace also starts; that is expected.)

- [ ] **Step 3: Verify routing**

In the browser:
- Visit `http://localhost:3007/shop` → the dark Categories grid renders (not the old hero/landing).
- Visit `http://localhost:3007/shop/categories` → redirects to `/shop`.
- Visit `http://localhost:3007/categories` → redirects to `/shop`.

- [ ] **Step 4: Verify breadcrumb chains**

Confirm each page shows the expected trail and that every linked crumb navigates correctly, while the last crumb is plain text (not a link):
- Categories (`/shop`): `Home › Categories`
- A category (`/shop/category/:id`): `Home › Categories › [Category]`
- A product (`/shop/product/:id`): `Home › Categories › [Category] › [Product]`
- All products (`/shop/products`): `Home › Categories › All Products`
- Cart (`/shop/cart`): `Home › Cart`
- Checkout (`/shop/checkout`): `Home › Cart › Checkout`
- Contact (`/shop/contact`): `Home › Contact`

Click `Home` → lands on `/landing2`. Click `Categories` → lands on `/shop`. Click a category crumb on the product page → lands on that category.

- [ ] **Step 5: Verify theme + language**

- Toggle the navbar theme button (light/dark) and confirm breadcrumb colors adapt (muted text, gold hover, readable current crumb) in both themes.
- Toggle language to Arabic and confirm crumb labels are translated (e.g. `الرئيسية`/`تواصل معنا`, `الأقسام`).

- [ ] **Step 6: Self-check against the spec**

Confirm against `docs/superpowers/specs/2026-06-26-shop-category-landing-breadcrumbs-design.md`: `/shop` = Categories ✓, Home retired ✓, `categories` routes redirect ✓, shared component used on all 7 listed pages ✓, ProductView's buggy breadcrumb replaced ✓.

---

## Self-Review (author checklist — completed)

- **Spec coverage:** Routing change (Task 1), retire Home (Task 1), redirect redundant routes (Task 1), shared component (Task 3), all 7 page wirings incl. ProductView replacement (Tasks 4–5), i18n (Task 2), verification incl. theme/RTL (Task 6). All spec sections covered.
- **Placeholder scan:** No TBD/TODO; every code step contains complete, paste-ready code. The only conditional is ContactUs Step 5 (`t` may already exist) — explicit instruction given for both cases.
- **Type consistency:** `Breadcrumbs` is `default` export taking `{ items: Crumb[] }`; every call site passes `items={[{ label, to? }]}` matching the `Crumb` interface. i18n keys used (`home`, `categories`, `all_products`, `cart`, `checkout`, `contact`) all exist after Task 2.
