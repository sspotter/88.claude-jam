# Jamhawi Theme System

This skill defines the exact color tokens, CSS variable names, and implementation rules for both the **dark theme (Artisanal Noir)** and the **light theme (Artisanal Alabaster)** used across the storefront (`/landing2`, `/shop/products`, `/category/:id`, `/product/:id`, `/cart`).

**Always reference this skill before touching any color, background, border, or shadow value in any storefront page.**

---

## How the Theme Toggle Works

The theme is controlled by a single `isDark: boolean` state in `Layout.tsx`. When toggled, it writes a full set of CSS custom properties onto `document.documentElement` (the `<html>` element). All pages read those variables via `var(--th-*)`.

**Never hardcode a color hex directly in a themed component.** Always use the `var(--th-*)` token listed below.

The toggle button lives in the Layout navbar — a `Sun` icon when dark (click to go light), a `Moon` icon when light (click to go dark).

---

## CSS Custom Properties — Complete Token Map

These are set by `Layout.tsx` → `useEffect([isDark])` on `document.documentElement`:

| Token | Dark Value | Light Value | Usage |
|---|---|---|---|
| `--th-bg` | `#131313` | `#FAF8F5` | Page / root background |
| `--th-surface` | `#1a1a1a` | `#FFFFFF` | Card backgrounds, panels |
| `--th-surface-hi` | `#2a2a2a` | `#EFECE6` | Elevated surfaces, hover states |
| `--th-text` | `#e5e2e1` | `#1C1B1B` | Primary text, headings |
| `--th-text-variant` | `#d0c5af` | `#5C5446` | Secondary text, nav labels |
| `--th-muted` | `#a0a0a0` | `#9E9380` | Placeholder text, icons, captions |
| `--th-gold` | `#f2ca50` | `#9E7B28` | Primary accent — buttons, prices, active states |
| `--th-gold-dim` | `#e9c349` | `#B8921F` | Gold top-accent lines on cards |
| `--th-gold-deep` | `#d4af37` | `#7A5E1A` | Gold hover state on buttons |
| `--th-outline` | `rgba(212,175,55,0.20)` | `rgba(158,147,128,0.30)` | Card borders, input borders, dividers |
| `--th-card-bg` | `linear-gradient(160deg,#1c1b1b 0%,#0e0e0e 100%)` | `linear-gradient(160deg,#FFFFFF 0%,#F5F1EB 100%)` | Product card background |
| `--th-card-img-bg` | `#201f1f` | `#EFECE6` | Image placeholder background |
| `--th-skel-bg` | `#2a2a2a` | `#E7E2D9` | Skeleton loading block fill |
| `--th-skel-line` | `#353534` | `#D5CDBF` | Skeleton loading line fill |
| `--th-empty-bg` | `#1a1a1a` | `#FFFFFF` | Empty state card background |
| `--th-nav-bg` | `rgba(13,13,13,0.92)` | `rgba(250,248,245,0.95)` | Navbar background (blurred glass) |
| `--th-nav-border` | `rgba(212,175,55,0.15)` | `rgba(158,123,40,0.15)` | Navbar bottom border |
| `--th-footer-bg` | `#0e0e0e` | `#EFECE6` | Footer background |
| `--th-search-bg` | `rgba(26,26,26,0.8)` | `rgba(255,255,255,0.8)` | Search input background |

---

## Dark Theme — Artisanal Noir

**Name:** Artisanal Noir  
**Personality:** Ultra-premium, authoritative, dark-mode-first, gold luminescence  
**Fonts:** Bodoni Moda (headings) + Manrope (body/labels)

### Raw Color Values (Dark)

```
Background:          #131313
Surface:             #1a1a1a
Surface elevated:    #2a2a2a
Surface highest:     #353534
Card gradient:       linear-gradient(160deg, #1c1b1b 0%, #0e0e0e 100%)

Text primary:        #e5e2e1
Text variant:        #d0c5af
Text muted:          #a0a0a0

Gold primary:        #f2ca50
Gold dim:            #e9c349
Gold deep:           #d4af37
Gold outline:        rgba(212,175,55,0.20)

Outline variant:     #4d4635
Surface tint:        #e9c349

Error:               #ffb4ab
Error container:     #93000a

In-stock green:      #4ade80  (tonal: rgba(74,222,128,0.08) bg, rgba(74,222,128,0.25) border)
Out-of-stock red:    #f87171  (tonal: rgba(248,113,113,0.08) bg, rgba(248,113,113,0.25) border)
```

### Dark Component Rules

**Navbar**
- Background: `rgba(13,13,13,0.92)` + `backdrop-filter: blur(32px)`
- Border-bottom: `1px solid rgba(212,175,55,0.15)`
- Logo: `/logo-dark2.jpeg` image
- Text/icons: `#e5e2e1`
- Hover backgrounds: `rgba(242,202,80,0.08)`

**Cards**
- Background: `linear-gradient(160deg, #1c1b1b 0%, #0e0e0e 100%)`
- Border: `1px solid rgba(212,175,55,0.20)`
- Top-accent line: `linear-gradient(90deg, transparent, #e9c349, transparent)` at 1px height, 20%–80% width
- Hover: `border-color: rgba(242,202,80,0.35)` + `box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(242,202,80,0.2)`
- Image background: `#201f1f`

**Buttons — Primary**
- Background: `#f2ca50`, color: `#131313`
- Hover: `background: #d4af37` + `box-shadow: 0 10px 32px rgba(242,202,80,0.40)`

**Buttons — Ghost**
- Border: `1px solid #f2ca50`, color: `#f2ca50`, background: `transparent`
- Hover: `background: rgba(242,202,80,0.08)`

**Inputs**
- Background: `#1a1a1a`, border: none, border-bottom: `1px solid rgba(212,175,55,0.20)`
- Focus border-bottom: `#f2ca50`
- Text: `#e5e2e1`, placeholder: `#a0a0a0`

**Selects**
- Background: `#1a1a1a`, border: `1px solid rgba(212,175,55,0.20)`, border-radius: `9999px`
- Color: `#e5e2e1`, focus border: `#f2ca50`
- Dropdown arrow SVG: stroke `%23f2ca50`

**Chips/Tags**
- Border: `1px solid #f2ca50`, color: `#f2ca50`, background: `transparent`
- Border-radius: `9999px`

**Dividers**
- `linear-gradient(90deg, transparent, rgba(212,175,55,0.35), transparent)` at 1px height

**Footer**
- Background: `#0e0e0e`
- Brand text: `#f2ca50` in Bodoni Moda
- Copyright text: `#4d4635`

---

## Light Theme — Artisanal Alabaster

**Name:** Artisanal Alabaster  
**Personality:** Sun-drenched, warm ivory, editorial, Mediterranean premium  
**Fonts:** Bodoni Moda (headings) + Manrope (body/labels) — identical to dark

### Raw Color Values (Light)

```
Background:          #FAF8F5
Surface:             #FFFFFF
Surface linen:       #EFECE6
Surface sand:        #F5F1EB
Surface high:        #E7E2D9
Surface highest:     #DDD8CE
Card gradient:       linear-gradient(160deg, #FFFFFF 0%, #F5F1EB 100%)

Text primary:        #1C1B1B
Text variant:        #5C5446
Text muted:          #9E9380

Gold primary:        #9E7B28
Gold dim:            #B8921F
Gold deep:           #7A5E1A
Gold outline:        rgba(158,147,128,0.30)

Outline stone:       #9E9380
Outline sandstone:   #D5CDBF

Error:               #BA1A1A
Error container:     #FFDAD6

In-stock green:      #16a34a  (tonal: rgba(22,163,74,0.08) bg, rgba(22,163,74,0.25) border)
Out-of-stock red:    #dc2626  (tonal: rgba(220,38,38,0.08) bg, rgba(220,38,38,0.25) border)
```

### Light Component Rules

**Navbar**
- Background: `rgba(250,248,245,0.95)` + `backdrop-filter: blur(32px)`
- Border-bottom: `1px solid rgba(158,123,40,0.15)`
- Logo: `/logo-dark2.jpeg` image (same — works on both)
- Text/icons: `#1C1B1B`
- Hover backgrounds: `rgba(158,123,40,0.08)`

**Cards**
- Background: `linear-gradient(160deg, #FFFFFF 0%, #F5F1EB 100%)`
- Border: `1px solid rgba(158,147,128,0.30)`
- Top-accent line: `linear-gradient(90deg, transparent, #B8921F, transparent)` at 1px height
- Hover: `border-color: rgba(158,123,40,0.35)` + `box-shadow: 0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(158,123,40,0.15)`
- Image background: `#EFECE6`

**Buttons — Primary**
- Background: `#9E7B28`, color: `#FFFFFF`
- Hover: `background: #7A5E1A` + `box-shadow: 0 10px 32px rgba(158,123,40,0.30)`

**Buttons — Ghost**
- Border: `1px solid #9E7B28`, color: `#9E7B28`, background: `transparent`
- Hover: `background: rgba(158,123,40,0.08)`

**Inputs**
- Background: `#F5F1EB`, border: none, border-bottom: `1px solid rgba(158,147,128,0.30)`
- Focus border-bottom: `#9E7B28`
- Text: `#1C1B1B`, placeholder: `#9E9380`

**Selects**
- Background: `#FFFFFF`, border: `1px solid rgba(158,147,128,0.30)`, border-radius: `9999px`
- Color: `#1C1B1B`, focus border: `#9E7B28`
- Dropdown arrow SVG: stroke `%239E7B28`

**Chips/Tags**
- Border: `1px solid #9E7B28`, color: `#5C5446`, background: `transparent`
- Border-radius: `9999px`

**Dividers**
- `linear-gradient(90deg, transparent, rgba(158,147,128,0.35), transparent)` at 1px height
- Or: `1px solid #D5CDBF` (solid sandstone variant)

**Footer**
- Background: `#EFECE6`
- Brand text: `#9E7B28` in Bodoni Moda
- Copyright text: `#9E9380`

---

## Implementation Pattern

Every themed page uses CSS custom properties scoped to a root class. Example for a product card:

```css
/* ✅ Correct — uses theme tokens */
.an-card {
  background: var(--th-card-bg);
  border: 1px solid var(--th-outline);
  color: var(--th-text);
}
.an-card__price {
  color: var(--th-gold);
}
.an-btn-primary {
  background: var(--th-gold);
  color: var(--th-bg);   /* always dark text on gold */
}

/* ❌ Wrong — hardcoded color */
.an-card {
  background: #1c1b1b;
  border: 1px solid rgba(212,175,55,0.20);
}
```

### In-file CSS variable declarations

Each page that breaks out of Layout (CategoryView, Products, ProductView, Cart) re-declares the tokens with fallbacks:

```css
.anc-root {
  --an-bg:        var(--th-bg,          #131313);
  --an-surface:   var(--th-surface,     #1a1a1a);
  --an-text:      var(--th-text,        #e5e2e1);
  --an-muted:     var(--th-muted,       #a0a0a0);
  --an-gold:      var(--th-gold,        #f2ca50);
  --an-gold-dim:  var(--th-gold-dim,    #e9c349);
  --an-gold-deep: var(--th-gold-deep,   #d4af37);
  --an-outline:   var(--th-outline,     rgba(212,175,55,0.20));
}
```

The fallback values are **always the dark theme values** since dark is the default (`isDark: true` on mount).

---

## CSS Class Prefixes by Page

| Page | CSS prefix | File |
|---|---|---|
| Landing2 | `an-` | `src/pages/Landing2.tsx` |
| Products | `anp2-` | `src/pages/Products.tsx` |
| CategoryView | `anc-` | `src/pages/CategoryView.tsx` |
| ProductView | `anp-` | `src/pages/ProductView.tsx` |
| Cart | `cart-` | `src/pages/Cart.tsx` |

---

## What NOT to Change When Implementing the Toggle

- **Font families** — Bodoni Moda and Manrope are the same in both themes
- **Border-radius values** — identical in both themes (`9999px` for pills, `16px` for cards, etc.)
- **Spacing/layout** — margins, paddings, grid columns are the same
- **Animation timings** — transitions stay the same
- **Logo image** — `/logo-dark2.jpeg` works on both backgrounds
- **Icon set** — Lucide icons, same sizes

Only **colors** change between themes. Everything else stays identical.

---

## Theme Toggle Button Location

In `src/components/Layout.tsx`, in the right section of the navbar, between the search bar and the language toggle:

```tsx
<button onClick={() => setIsDark(!isDark)}>
  {isDark ? <Sun size={15} /> : <Moon size={15} />}
</button>
```

State: `const [isDark, setIsDark] = useState(true)` — dark is default.
