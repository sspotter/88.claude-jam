# Mobile View — Audit & Fix Plan

_Last updated: 2026-06-26 · Branch: `feat/admin-base-currency`_

A live audit of the running app (Vite dev on `:3007`) at phone width (390×844,
iPhone 12 class) plus a 320–360px stress pass. **The app is already broadly
responsive** — the sidebar collapses to a hamburger, card grids reflow, and admin
tables become stacked cards. This document captures the few real issues found and
a repeatable checklist so every page stays correct on mobile.

## How this was tested

- Tooling: Playwright (`browser_resize` → `browser_navigate` → `browser_take_screenshot fullPage`).
- Primary viewport: **390 × 844** (most modern phones).
- Stress viewports to add: **320 × 568** (iPhone SE 1st gen) and **360 × 800** (common Android).
- Check in both **light/dark** themes and **EN/AR** (RTL) — the storefront has a language toggle and Arabic flips layout direction.

To reproduce:

```bash
npm run dev:web         # serves on :3007 (or next free port)
# then drive with Playwright at width=390, or use browser devtools device mode
```

## Audit results (live)

| Page | Route | Mobile state | Action |
|------|-------|--------------|--------|
| Landing | `/landing2` | OK | spot-check 320px |
| Products grid | `/products` | OK — 2-col grid, but **header crowded** | fix header (see G1) |
| Product detail | `/product/:id` | not captured | verify (image, weight selector, sticky CTA) |
| Cart | `/cart` | OK | verify qty steppers are ≥44px |
| Checkout | `/checkout` | OK — form + 3-col payment grid clean | verify 320px payment labels |
| Admin Dashboard | `/admin/dashboard` | OK — cards stack, chart fits | see G4 (chart size warning) |
| Admin Analytics | `/admin/analytics` | OK — charts fit, filters stack | see G4 |
| Admin Orders | `/admin/orders` | OK — table → cards | — |
| Admin Pricing | `/admin/pricing` | OK | — |
| Admin Settings | `/admin/settings` | not captured | verify wide forms |
| Admin Products/Inventory/Customers | `/admin/*` | not captured | verify tables → cards |

> Screenshots from this pass were saved under `.playwright-mcp/` during the audit
> (transient; not committed).

## Global issues & fixes

### G1 — Storefront header is crowded on small phones (primary issue)

**Where:** [src/components/Layout.tsx:164-253](src/components/Layout.tsx#L164-L253)

On mobile the right cluster renders **five** controls in one row: mobile search
(`md:hidden flex-1 max-w-xs`), theme toggle, `<CurrencySelector />`, language
toggle, and cart. At 390px the search pill is already squeezed; at ≤360px the row
risks overflow or wrapping.

A `MobileMenu` drawer already exists and already renders the currency selector
([src/components/MobileMenu.tsx:158](src/components/MobileMenu.tsx#L158)).

**Fix:** keep only **search + cart** (and the hamburger) in the top bar on mobile;
move **theme, currency, and language** into the hamburger drawer.

```tsx
// Layout.tsx — wrap the secondary controls so they only show from md up
<button className="hidden md:flex" /* theme toggle */ >…</button>
<div className="hidden md:block"><CurrencySelector /></div>
<button className="hidden md:flex" /* language toggle */ >…</button>
// Cart stays visible at all sizes.
```

Then ensure `MobileMenu` also exposes theme + language toggles (it already has currency).

### G2 — Enforce minimum tap-target size (44×44)

Header controls already set `minWidth/minHeight: 44px` (good). Apply the same to
**every** icon-only button in storefront cards and admin rows (e.g. "Ship",
"Delete", qty +/−, sort/availability selects).

```css
/* utility to lean on */
.tap { min-height: 44px; min-width: 44px; }
```

### G3 — Guard against horizontal overflow

No overflow was observed on audited pages, but add a global safety net and a CI/QA
assertion that `document.documentElement.scrollWidth <= window.innerWidth`.

```css
/* index.css */
html, body { overflow-x: hidden; }
img, svg, video { max-width: 100%; height: auto; }
```

Watch list: long product names, untranslated strings, formatted money like
`2,174.00 AED` stacked in narrow cards, and any remaining raw `<table>` that hasn't
been converted to the card pattern.

### G4 — Recharts "width(-1)/height(-1)" warning

**Where:** Dashboard/Analytics `ResponsiveContainer` wrappers (e.g. the `h-72`
chart box in [src/pages/admin/Dashboard.tsx:549](src/pages/admin/Dashboard.tsx#L549)).

Benign (self-corrects after layout) but noisy. The container briefly reports no
size. Give the chart box an explicit min height and avoid `height="100%"` inside a
flex parent that can collapse:

```tsx
<div className="h-72 w-full min-h-[18rem]">
  <ResponsiveContainer width="100%" height="100%" minHeight={288}> … </ResponsiveContainer>
```

### G5 — Safe-area insets (notch / home indicator)

For sticky bars and the bottom CTA, respect iOS safe areas:

```css
.safe-b { padding-bottom: env(safe-area-inset-bottom); }
```
Add `viewport-fit=cover` to the `<meta name="viewport">` in `index.html` if not present.

### G6 — RTL (Arabic) pass

Arabic flips direction. Replace any hardcoded `left/right` with logical
equivalents (`ms-*`/`me-*`, `start/end`) so icons and paddings mirror correctly.
Example: the search icon is positioned `right-3` ([Layout.tsx:187](src/components/Layout.tsx#L187)) — verify it sits correctly in RTL.

## Per-page verification checklist

Run each page at **320 / 360 / 390** in light+dark, EN+AR:

- [ ] No horizontal scroll (`scrollWidth <= innerWidth`).
- [ ] All interactive controls ≥ 44×44.
- [ ] Text doesn't clip or overlap; long names wrap or truncate (`truncate`/`line-clamp-2`).
- [ ] Images use `max-w-full` and a defined aspect ratio (no layout shift).
- [ ] Tables either become cards or are wrapped in `overflow-x-auto` with a visible scroll affordance.
- [ ] Modals/drawers fit the viewport and scroll internally (`max-h-[90vh] overflow-y-auto`) — the Dashboard day-detail modal already does this.
- [ ] Forms: inputs full-width, `font-size ≥ 16px` to avoid iOS zoom-on-focus.
- [ ] Sticky/bottom CTAs respect safe-area insets.

### Storefront

- [ ] `/landing2` — hero text scales; CTAs stack; no overflow.
- [ ] `/products` — header decluttered (G1); 2-col grid; filter chips wrap.
- [ ] `/product/:id` — image first, details below; weight selector usable; price + Add-to-Cart reachable (consider a sticky CTA).
- [ ] `/cart` — line items stack; qty steppers tappable; summary above the fold.
- [ ] `/checkout` — payment 3-col grid OK at 390; check labels at 320 (consider `grid-cols-1 xs:grid-cols-3`).
- [ ] `/shop/categories`, `/shop/contact` — grids reflow.

### Admin

- [ ] Layout — sidebar collapses to hamburger (works); drawer scrolls.
- [ ] Dashboard / Analytics — stat cards stack; charts fit (G4).
- [ ] Orders / Customers / Inventory / Products — table→card pattern everywhere.
- [ ] Pricing / Settings — wide forms become single-column; currency checkboxes usable.

## Reusable Tailwind patterns

```tsx
// Responsive grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Table → cards (hide table on mobile, show stacked cards)
<table className="hidden md:table …" />
<div className="md:hidden space-y-3"> …card per row… </div>

// Truncate long names
className="truncate"            // single line
className="line-clamp-2"        // two lines

// Hide secondary controls on mobile (move into drawer)
className="hidden md:flex"
```

## Suggested execution order

1. **G1** storefront header declutter (highest visible impact). 
2. **G3** global overflow guard + add the `scrollWidth` QA assertion.
3. **G2** tap-target sweep across cards/rows.
4. **G4/G5/G6** chart sizing, safe areas, RTL polish.
5. Walk the per-page checklist at 320/360/390 and tick boxes.

## Acceptance criteria

- Every route passes the per-page checklist at 320, 360, and 390px, in light+dark and EN+AR.
- Zero horizontal scrolling on any page.
- No console key/responsive warnings introduced.
