# Jamhawi Navbar

This skill documents the exact structure, behavior, and styling rules for the storefront navbar in `src/components/Layout.tsx`.

**Always reference this skill before touching anything in the navbar — layout, items, icons, hover states, or theme tokens.**

---

## File Location

```
src/components/Layout.tsx
```

The navbar is part of the `Layout` component, which wraps all storefront routes via `<Outlet />`. It is **not** used in the admin panel (`AdminLayout.tsx`).

---

## Layout Structure

The navbar is a sticky `<header>` with two sides separated by `justify-between`:

```
┌─────────────────────────────────────────────────────────┐
│  [☰ mobile only]  [Logo]  [Search — desktop only]      │  ← LEFT
│                          [Search — mobile] [☀/☾] [عربي/EN] [🛒] [Admin] │  ← RIGHT
└─────────────────────────────────────────────────────────┘
```

### Left side — `.flex.items-center.gap-4.md:gap-8`
1. **Hamburger button** — mobile only (`md:hidden`), opens `<MobileMenu />`
2. **Logo** — `<Link to="/landing2">` wrapping `<img src="/logo-dark2.jpeg" />`
3. **Desktop search bar** — hidden on mobile (`hidden md:block`), max-w-sm

### Right side — `.flex.items-center.gap-3.md:gap-5`
1. **Mobile search** — visible on mobile only (`md:hidden`), inline in right group
2. **Theme toggle** — `Sun` icon (dark mode) / `Moon` icon (light mode)
3. **Language toggle** — shows `"عربي"` when English active, `"EN"` when Arabic active
4. **Cart link** — `<Link to="/cart">` with animated badge for item count
5. **Admin link** — `<Link to="/admin/login">`, hidden on xs (`hidden sm:flex`)

---

## Fixed Layout Rule

**The layout direction is always LTR regardless of language.**

```ts
useEffect(() => {
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = "ltr"; // never change this to rtl
}, [i18n.language]);
```

Switching Arabic ↔ English changes translations only — it never flips the navbar or any other layout. Do not revert this to `rtl`.

---

## Item-by-Item Reference

### Hamburger (mobile only)
```tsx
<button
  onClick={toggleMobileMenu}
  className="md:hidden p-2 rounded-full transition-colors"
  style={{ color: "var(--th-text)" }}
  onMouseEnter={e => e.currentTarget.style.background = "rgba(158,123,40,0.08)"}
  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
  aria-label="Open menu"
>
  <Menu className="w-6 h-6" />
</button>
```

### Logo
```tsx
<Link to="/landing2" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
  <img
    src="/logo-dark2.jpeg"
    alt="Jamhawi"
    style={{ height: "2.5rem", width: "auto", objectFit: "contain" }}
    className="md:h-12"
  />
</Link>
```
- Image: `/logo-dark2.jpeg` — works on both dark and light backgrounds
- Links to `/landing2`

### Desktop Search
```tsx
<div className="hidden md:block flex-1 max-w-sm mx-4">
  <form onSubmit={handleSearchSubmit} className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search className="h-4 w-4" style={{ color: "#99907c" }} />
    </div>
    <input
      type="text"
      placeholder="Search products..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        width: "100%",
        paddingLeft: "2.25rem", paddingRight: "1rem",
        paddingTop: "0.5rem", paddingBottom: "0.5rem",
        borderRadius: "9999px",
        border: "1px solid var(--th-outline)",
        background: "var(--th-search-bg)",
        color: "var(--th-text)",
        fontSize: "0.875rem", outline: "none",
        transition: "border-color 200ms ease",
      }}
      onFocus={e => e.target.style.borderColor = "var(--th-gold)"}
      onBlur={e => e.target.style.borderColor = "var(--th-outline)"}
    />
  </form>
</div>
```
- State: `useSearchStore` — `searchQuery` + `setSearchQuery`
- Submit: navigates to `"/"` if query is non-empty

### Mobile Search
Same input but placed in the **right group**, visible only on mobile (`md:hidden`). Icon is inside the input on the right instead of the left:
```tsx
<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#99907c" }} />
```

### Theme Toggle Button
```tsx
<button
  onClick={() => setIsDark(!isDark)}
  title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
  style={{
    width: "2.4rem", height: "2.4rem",
    borderRadius: "50%",
    border: `1px solid ${isDark ? "rgba(212,175,55,0.2)" : "rgba(168,122,51,0.25)"}`,
    background: "transparent",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: isDark ? "#d0c5af" : "#8C7A6B",
    transition: "all 200ms ease",
    flexShrink: 0,
  }}
>
  {isDark ? <Sun size={15} /> : <Moon size={15} />}
</button>
```
- State: `const [isDark, setIsDark] = useState(true)` — **dark is the default**
- Hover: color → `#f2ca50`, border → `#f2ca50`, background → `rgba(242,202,80,0.08)`
- onMouseLeave: restore values based on current `isDark` state

### Language Toggle Button
```tsx
<button
  onClick={toggleLanguage}
  title="Toggle Language"
  style={{
    fontSize: "0.8rem", fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--th-text-variant)",
    background: "transparent",
    border: "1px solid var(--th-outline)",
    borderRadius: "9999px",
    padding: "0.3rem 0.85rem",
    minWidth: "44px", minHeight: "44px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "color 200ms ease, border-color 200ms ease",
  }}
>
  {i18n.language === "ar" ? "EN" : "عربي"}
</button>
```
- Calls `i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")`
- Hover: color → `var(--th-gold)`, border → `var(--th-gold)`
- Label: shows the **opposite** language from the current one

### Cart Link
```tsx
<Link
  to="/cart"
  style={{ minWidth: "44px", minHeight: "44px", color: "var(--th-text)", padding: "0.5rem" }}
>
  <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
  {cartCount > 0 && (
    <motion.span
      key={cartCount}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        position: "absolute", top: 0, right: 0,
        marginTop: "-4px", marginRight: "-4px",
        width: "1.15rem", height: "1.15rem",
        background: "#f2ca50", color: "#131313",
        fontSize: "0.6rem", fontWeight: 700,
        borderRadius: "9999px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {cartCount}
    </motion.span>
  )}
</Link>
```
- State: `useCartStore` → `items` → reduce to `cartCount`
- Badge: gold `#f2ca50` background, dark `#131313` text — fixed colors (same in both themes)
- Hover: `background: rgba(158,123,40,0.08)`

### Admin Link
```tsx
<Link
  to="/admin/login"
  className="hidden sm:flex items-center gap-1.5"
  style={{
    padding: "0.35rem 1rem", borderRadius: "9999px",
    border: "1px solid var(--th-outline)",
    color: "var(--th-text-variant)",
    fontSize: "0.78rem", fontWeight: 600,
    letterSpacing: "0.04em", textDecoration: "none",
    transition: "all 200ms ease",
  }}
>
  <LogIn className="w-4 h-4" />
  <span>Admin</span>
</Link>
```
- Hidden on xs screens (`hidden sm:flex`)
- Hover: color → `var(--th-gold)`, border → `var(--th-gold)`, background → `rgba(158,123,40,0.06)`

---

## Navbar Container Styles

```tsx
<header
  style={{
    position: "sticky", top: 0, zIndex: 50,
    background: "var(--th-nav-bg)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    borderBottom: "1px solid var(--th-nav-border)",
  }}
>
  <div className="w-full px-4 sm:px-6">
    <div className="flex justify-between items-center h-16 md:h-20">
```

| Property | Value |
|---|---|
| Position | `sticky`, `top: 0`, `z-index: 50` |
| Background | `var(--th-nav-bg)` (glassmorphism) |
| Blur | `backdrop-filter: blur(32px)` |
| Border | `1px solid var(--th-nav-border)` |
| Height | `h-16` (4rem) mobile / `md:h-20` (5rem) desktop |
| Padding | `px-4 sm:px-6` |

---

## Theme Tokens Used in Navbar

All color values must use these tokens — never hardcode hex values for themed elements:

| Token | Used for |
|---|---|
| `var(--th-nav-bg)` | Header background |
| `var(--th-nav-border)` | Header bottom border |
| `var(--th-text)` | Icon colors, hamburger |
| `var(--th-text-variant)` | Language toggle text, admin link text |
| `var(--th-gold)` | Hover accent color on all interactive items |
| `var(--th-outline)` | Border on language toggle, admin link, search input |
| `var(--th-search-bg)` | Search input background |

See `jamhawi-themes.md` for full token values per theme.

---

## Imports Required

```ts
import React, { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, LogIn, Menu, Search, Sun, Moon } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useSearchStore } from "../store/searchStore";
import { motion } from "motion/react";
import MobileMenu from "./MobileMenu";
```

`JamhawiLogo` is imported but not used in the current navbar — the logo is rendered via `<img>` instead.

---

## MobileMenu Component

Rendered below `<header>`, receives:
```tsx
<MobileMenu
  isOpen={isMobileMenuOpen}
  onClose={() => setIsMobileMenuOpen(false)}
  cartCount={cartCount}
/>
```
File: `src/components/MobileMenu.tsx`

---

## Rules When Modifying the Navbar

1. **Never add `dir="rtl"`** on the html element based on language — direction is always LTR
2. **Never hardcode theme colors** — use `var(--th-*)` tokens
3. **Keep item order**: hamburger → logo → desktop-search (left) | mobile-search → theme → language → cart → admin (right)
4. **Maintain 44px minimum touch targets** on all interactive elements (`minWidth/minHeight: "44px"`)
5. **Cart badge colors** (`#f2ca50` / `#131313`) are exempt from theming — they stay fixed
6. **Search icon color** (`#99907c`) is also fixed — it's a neutral mid-tone that works on both themes
7. The logo image `/logo-dark2.jpeg` works on both dark and light nav backgrounds — do not switch it per theme
