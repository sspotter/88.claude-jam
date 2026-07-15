# Logo assets — current state (snapshot: 2026-07-15)

This documents exactly which logo image file renders in every place the app shows a
logo, and which condition (theme / language) picks it. Written as a baseline **before**
any further logo changes, so future edits have something to diff against.

Two switches exist in the app and it's easy to conflate them:

- **Light/Dark UI theme** — `isDark` state in [Layout.tsx](../src/components/Layout.tsx#L19),
  persisted to `localStorage["jamhawi-theme"]`, defaults to dark. Passed as a prop into
  `MobileMenu`. This is the only theme that affects logo choice.
- **Admin color-palette theme** (`default` / `ocean` / `forest` / `sunset`) — set via
  `document.documentElement.dataset.theme` in [App.tsx](../src/App.tsx#L49), configured in
  admin Settings, drives CSS `[data-theme="..."]` rules in `index.css`. Unrelated to logos —
  no logo conditional reads this value.

Language is `i18n.language` (`"ar" | "en"`) from `react-i18next`, see [i18n.ts](../src/i18n.ts).

---

## Matrix: which file renders where

| Component | Route(s) | Light + EN | Light + AR | Dark + EN | Dark + AR |
|---|---|---|---|---|---|
| [Layout.tsx](../src/components/Layout.tsx#L110-L115) (storefront nav) | `/shop/*`, `/cart`, `/checkout*`, `/products`, `/categories`, `/contact`, etc. | `nav-logo-eng-light.png` | `nav-logo-eng-light.png` | `nav-logo-eng.png` | `nav-logo-eng.png` |
| [MobileMenu.tsx](../src/components/MobileMenu.tsx#L88-L93) (slide-in panel, shares `isDark` prop with Layout) | same routes as Layout | `nav-logo-eng-light.png` | `nav-logo-eng-light.png` | `nav-logo-eng.png` | `nav-logo-eng.png` |
| [Landing2.tsx](../src/pages/Landing2.tsx#L729-L733) nav (header) | `/`, `/landing2` | `nav-logo-eng.png` *(page has no light mode)* | `nav-logo-eng.png` | `nav-logo-eng.png` | `nav-logo-eng.png` |
| [Landing2.tsx](../src/pages/Landing2.tsx#L932) footer | `/`, `/landing2` | `footer-logo.png` | `footer-logo.png` | `footer-logo.png` | `footer-logo.png` |
| [Layout.tsx](../src/components/Layout.tsx#L199-L203) footer | `/shop/*`, `/cart`, `/checkout*`, `/products`, `/categories`, `/contact`, etc. | `footer-logo.png` | `footer-logo.png` | `footer-logo.png` | `footer-logo.png` |
| [AdminLayout.tsx](../src/components/AdminLayout.tsx#L170) sidebar (`JamhawiLogo variant="mark"`) | `/admin/dashboard`, `/admin/analytics`, `/admin/orders`, `/admin/products`, `/admin/inventory`, `/admin/categories`, `/admin/customers`, `/admin/offers`, `/admin/pricing`, `/admin/settings`, `/admin/audit` | inline SVG (no file) | inline SVG | inline SVG | inline SVG |
| `/admin/login` | — | *(no logo rendered on this page)* | | | |
| [NotFound.tsx](../src/components/NotFound.tsx#L12) (404 / router `errorElement`) | every route's `errorElement`, plus `path: "*"` | `logo.jpeg` | `logo.jpeg` | `logo.jpeg` | `logo.jpeg` |
| `index.html` browser favicon | global | `logo.jpeg` | `logo.jpeg` | `logo.jpeg` | `logo.jpeg` |

**Key takeaway:** the Arabic/English switch currently does **nothing** for the logo — every
component that branches on `i18n.language` for its `src` resolves both branches to the same
English-logo filename. Only the light/dark switch (Layout + MobileMenu only) actually changes
the file. This was a deliberate change (commit `e37cf05 "updating logo to eng"`, 2026-07-15) —
previously Layout/MobileMenu did serve `nav-logo-ar.png` / `nav-logo-ar-light.png` for Arabic.

---

## Files in `public/` and their status

| File | Referenced by | Status |
|---|---|---|
| `nav-logo-eng.png` | Layout (dark), MobileMenu (dark), Landing2 nav (always) | ✅ in use |
| `nav-logo-eng-light.png` | Layout (light), MobileMenu (light) | ✅ in use |
| `footer-logo.png` | Landing2 footer, Layout footer (shop/products/categories/cart/checkout/contact) | ✅ in use in both footers — **new asset, uncommitted as of this writing** (`git status` shows it untracked; the two footer edits pointing at it are also uncommitted). Commit the asset + both edits together when ready. Previously the Layout footer showed a plain text wordmark (`{t("app_name")}`, i.e. "Jamhawi"/"جمحاوي") instead of an image — that was replaced with this logo. |
| `nav-logo-ar.png` | *(nothing — orphaned)* | ⚠️ present on disk, no longer referenced by any component since `e37cf05`. Kept in case Arabic-specific branding is reintroduced. |
| `nav-logo-ar-light.png` | *(nothing — orphaned)* | ⚠️ same as above |
| `nav-logo-eng-Photoroom.png` | *(nothing yet)* | ℹ️ new file present in `public/`, not wired into any component yet — looks like a prepped asset (background-removed export) for a future swap |
| `logo.jpeg` | `NotFound.tsx`, `index.html` favicon | 🔴 **broken reference** — file was deleted from `public/` in commit `b290fa8 "updating size"` (repo-size cleanup). The 404 page and browser favicon currently point at a file that doesn't exist. |
| `t1.png` | `JamhawiLogo.tsx` non-`"mark"` branch (`variant="full"` / `"horizontal"`) | 🔴 **broken reference**, same cleanup commit deleted it — but this code path is never actually invoked anywhere in the app (only `variant="mark"` is ever used, in `AdminLayout.tsx`), so it's dormant dead code rather than a live bug. |

---

## Mechanism notes (for whoever changes this next)

- **To make Arabic actually show a different logo again** in Layout/MobileMenu: restore the
  `nav-logo-ar.png` / `nav-logo-ar-light.png` branches that commit `e37cf05` removed — the
  files still exist in `public/`, only the JSX ternaries were simplified.
- **Landing2.tsx has no light/dark mode** — it's a fixed dark "Artisanal Noir" design
  (`an-root` CSS variables are hardcoded). Its nav logo has never branched on theme, only
  (previously) on language.
- **Landing2.tsx nav is pinned `dir="ltr"`** ([Landing2.tsx:728](../src/pages/Landing2.tsx#L728))
  independent of the page's overall RTL direction ([Landing2.tsx:725](../src/pages/Landing2.tsx#L725):
  `dir={i18n.language === "ar" ? "rtl" : "ltr"}` on the root), so the logo always sits left and
  the nav buttons always sit right regardless of language — this was an explicit requirement,
  not an oversight.
- **Fix the two broken references** (`logo.jpeg`, `t1.png`) before the next production build —
  either restore the files or repoint `NotFound.tsx` / `index.html` / `JamhawiLogo.tsx` at a
  file that still exists (e.g. `nav-logo-eng.png`). Not fixed here since it wasn't asked for;
  flagging so it isn't shipped by accident.
- Two stale `.kiro/skills/*.md` docs (`jamhawi-navbar.md`, `jamhawi-themes.md`) describe an
  older navbar (`logo-dark2.jpeg`, inline search bar, inline theme/language toggles in
  `Layout.tsx`) that no longer matches the current implementation — don't use them as a source
  of truth for the navbar; this file supersedes them for logo behavior specifically.
