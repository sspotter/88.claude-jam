---
name: Admin Light — Stone & Warm White
source: Extracted from AdminLayout.tsx, Dashboard.tsx, Settings.tsx, and shared CSS variables
colors:
  # ── Page / Layout ──────────────────────────────────────────────
  page-bg:               '#F5F5F4'   # stone-100 — outermost shell background
  sidebar-bg:            '#FFFFFF'   # pure white sidebar
  topbar-bg:             '#FFFFFF'   # pure white top header
  content-area-bg:       '#F5F5F4'   # stone-100 behind the card grid

  # ── Card surfaces ──────────────────────────────────────────────
  card-bg:               '#FFFFFF'   # bg-white on every data card
  card-border:           '#E7E5E4'   # border-stone-100
  card-shadow:           'shadow-sm' # 0 1px 3px rgba(0,0,0,0.06)

  # ── Borders & Separators ───────────────────────────────────────
  border-default:        '#E7E5E4'   # border-stone-200 (sidebar, topbar bottom)
  border-table-row:      '#F5F5F4'   # divide-stone-100 (table row dividers)
  border-light:          '#F5F5F4'   # border-stone-50 (search dropdown rows)

  # ── Primary brand ──────────────────────────────────────────────
  primary:               '#1C1C1C'   # --color-primary  (default theme)
  primary-ocean:         '#0F2C59'
  primary-forest:        '#1A3636'
  primary-sunset:        '#451952'

  # ── Accent / interactive ───────────────────────────────────────
  accent:                '#8C7A6B'   # --color-accent   (default theme)
  accent-ocean:          '#DAC0A3'
  accent-forest:         '#D6BD98'
  accent-sunset:         '#F39F5A'

  # ── Text hierarchy ─────────────────────────────────────────────
  text-heading:          '#1C1C1C'   # text-[var(--color-primary)] — page h1, card values
  text-body:             '#44403C'   # text-stone-700 — normal body copy
  text-secondary:        '#78716C'   # text-stone-500 — labels, sub-labels
  text-muted:            '#A8A29E'   # text-stone-400 — placeholder, icon default
  text-sidebar-item:     '#57534E'   # text-stone-600 — inactive nav items
  text-on-primary:       '#FFFFFF'   # white text on --color-primary buttons
  text-on-accent:        '#FFFFFF'   # white text on --color-accent active nav

  # ── Status colors ──────────────────────────────────────────────
  pending-bg:            '#FEF9C3'   # bg-yellow-100
  pending-text:          '#854D0E'   # text-yellow-700
  shipped-bg:            '#DCFCE7'   # bg-green-100
  shipped-text:          '#15803D'   # text-green-700
  insight-positive-bg:   '#F0FDF4'   # bg-green-50
  insight-positive-border: '#DCFCE7' # border-green-100
  insight-positive-text: '#166534'   # text-green-800
  insight-warning-bg:    '#FEFCE8'   # bg-yellow-50
  insight-warning-border: '#FEF9C3'  # border-yellow-100
  insight-warning-text:  '#854D0E'   # text-yellow-800
  insight-info-bg:       '#EFF6FF'   # bg-blue-50
  insight-info-border:   '#DBEAFE'   # border-blue-100
  insight-info-text:     '#1D4ED8'   # text-blue-800
  low-stock-bg:          '#FFF1F2'   # bg-red-50/30
  low-stock-border:      '#FEE2E2'   # border-red-100
  low-stock-text:        '#EF4444'   # text-red-500

  # ── Stat card icon chips ────────────────────────────────────────
  chip-blue-bg:          '#EFF6FF'   # bg-blue-50
  chip-blue-icon:        '#2563EB'   # text-blue-600
  chip-green-bg:         '#F0FDF4'   # bg-green-50
  chip-green-icon:       '#16A34A'   # text-green-600
  chip-purple-bg:        '#FAF5FF'   # bg-purple-50
  chip-purple-icon:      '#9333EA'   # text-purple-600

  # ── Chart colors ───────────────────────────────────────────────
  chart-area-stroke:     'var(--color-accent)'  # AreaChart line / Area fill
  chart-area-fill-start: 'rgba(140,122,107,0.30)'
  chart-area-fill-end:   'rgba(140,122,107,0)'
  chart-grid:            '#F5F5F4'   # CartesianGrid lines
  chart-axis-text:       '#78716C'   # tick labels (stone-500)
  chart-tooltip-border:  '#E7E5E4'   # border on recharts tooltip
  chart-pie-pending:     '#EAB308'   # yellow-500
  chart-pie-shipped:     '#22C55E'   # green-500

  # ── Table ──────────────────────────────────────────────────────
  table-header-bg:       '#F9FAFB'   # bg-stone-50
  table-header-text:     '#78716C'   # text-stone-500
  table-row-hover:       '#F9FAFB'   # hover:bg-stone-50
  table-cell-text:       '#1C1C1C'   # text-[var(--color-primary)]

  # ── Search ─────────────────────────────────────────────────────
  search-bg:             '#F5F5F4'   # bg-stone-100 (topbar search field)
  search-focus-ring:     'var(--color-accent)'
  search-dropdown-bg:    '#FFFFFF'
  search-dropdown-border: '#F5F5F4'  # border-stone-100
  search-dropdown-hover: '#F9FAFB'   # hover:bg-stone-50

  # ── Sidebar ────────────────────────────────────────────────────
  sidebar-active-bg:     'var(--color-accent)'
  sidebar-active-text:   '#FFFFFF'
  sidebar-hover-bg:      '#F9FAFB'   # hover:bg-stone-50
  sidebar-hover-text:    '#1C1C1C'   # hover:text-[var(--color-primary)]
  sidebar-icon-default:  '#57534E'   # text-stone-600
  sidebar-logo-text:     '#1C1C1C'   # text-[var(--color-primary)]
  sidebar-divider:       '#E7E5E4'   # border-stone-200

  # ── Buttons ────────────────────────────────────────────────────
  btn-primary-bg:        '#1C1C1C'   # bg-[var(--color-primary)]
  btn-primary-hover:     '#8C7A6B'   # hover:bg-[var(--color-accent)]
  btn-primary-text:      '#FFFFFF'
  btn-secondary-bg:      '#F5F5F4'   # bg-stone-100
  btn-secondary-border:  '#E7E5E4'   # border-stone-200
  btn-secondary-text:    '#44403C'   # text-stone-700
  btn-secondary-hover:   '#E7E5E4'   # hover:bg-stone-200
  btn-danger-text:       '#DC2626'   # text-red-600
  btn-danger-hover-bg:   '#FEF2F2'   # hover:bg-red-50
  btn-dark-bg:           '#292524'   # bg-stone-800
  btn-dark-hover:        '#44403C'   # hover:bg-stone-700
  btn-dark-text:         '#FFFFFF'

  # ── Form inputs ────────────────────────────────────────────────
  input-bg:              '#FFFFFF'
  input-border:          '#E7E5E4'   # border-stone-200
  input-focus-ring:      'var(--color-accent)'
  input-placeholder:     '#A8A29E'   # text-stone-400
  input-text:            '#1C1C1C'

  # ── Modal / Overlay ────────────────────────────────────────────
  modal-bg:              '#FFFFFF'
  modal-overlay:         'rgba(28,24,23,0.50)'  # bg-stone-900/50
  modal-backdrop-blur:   'blur(4px)'
  modal-border:          '#E7E5E4'

  # ── Avatar / Profile ───────────────────────────────────────────
  avatar-bg:             '#E7E5E4'   # bg-stone-200
  avatar-text:           '#78716C'   # text-stone-600

typography:
  page-heading:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '400'
    color: var(--color-primary)
    note: font-serif on all h1 inside admin pages
  section-heading:
    fontFamily: system-ui / Inter
    fontSize: 18px
    fontWeight: '500'
    color: '#292524'   # text-stone-800
  card-value:
    fontFamily: system-ui / Inter
    fontSize: 30px
    fontWeight: '700'
    color: var(--color-primary)
  label:
    fontFamily: system-ui / Inter
    fontSize: 14px
    fontWeight: '500'
    color: '#78716C'   # text-stone-500
  table-header:
    fontFamily: system-ui / Inter
    fontSize: 14px
    fontWeight: '500'
    color: '#78716C'
  body:
    fontFamily: system-ui / Inter
    fontSize: 14px
    fontWeight: '400'
    color: '#57534E'   # text-stone-600
  badge:
    fontFamily: system-ui / Inter
    fontSize: 12px
    fontWeight: '700'
    letterSpacing: 0.05em
    textTransform: uppercase
  nav-item:
    fontFamily: system-ui / Inter
    fontSize: 14px
    fontWeight: '500'
  sidebar-title:
    fontFamily: Playfair Display
    fontSize: 16px
    fontWeight: '700'
    color: var(--color-primary)

rounded:
  card:     1rem      # rounded-2xl  (16px) — main cards
  btn:      0.75rem   # rounded-xl   (12px) — buttons, inputs
  btn-sm:   0.5rem    # rounded-lg   (8px)  — small action buttons
  badge:    0.375rem  # rounded-md   (6px)  — status badges
  chip:     0.5rem    # rounded-lg   (8px)  — icon chips on stat cards
  input:    0.75rem   # rounded-xl   (12px) — text inputs / selects
  full:     9999px    # rounded-full        — avatar, focus rings
  sidebar-item: 0.5rem # rounded-lg   (8px)  — nav links

spacing:
  sidebar-width:         256px   # default expanded
  sidebar-collapsed:     64px    # icon-only mode
  topbar-height:         80px
  page-padding-desktop:  32px    # p-8
  page-padding-mobile:   16px    # p-4
  card-padding:          24px    # p-6
  card-padding-lg:       32px    # p-8 — settings/large cards
  card-gap:              24px    # gap-6 — grid gap between cards
  section-gap:           32px    # space-y-8

shadows:
  card:   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'  # shadow-sm
  modal:  '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
  dropdown: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'

layout:
  sidebar: fixed on mobile (slide-in), relative on desktop; collapsible
  main: flex-col, h-screen overflow-hidden
  content: flex-1 overflow-auto
  grid-overview: grid-cols-1 → md:grid-cols-2 → lg:grid-cols-4
  grid-charts: grid-cols-1 → lg:grid-cols-3 (chart spans 2, pie spans 1)
  grid-widgets: grid-cols-1 → lg:grid-cols-3 (recent orders spans 2, sidebar spans 1)
  grid-settings: grid-cols-1 → sm:grid-cols-2

---

## Overview

The admin panel uses a **Clean Light Corporate** style — functional, high-contrast on light backgrounds, with warm stone tones rather than cold greys. Every interactive element has a clear accessible focus ring, and the visual hierarchy is driven by font-weight and tonal contrast rather than colour explosions.

The foundation is Tailwind's **stone** palette (warm grey with a brown undertone), which pairs naturally with the brand's warm gold/earth accent colours. Pure white cards sit on a `stone-100` background to create a subtle but clear elevation layer.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (white, border-r stone-200)                │
│  ┌── Logo + Collapse toggle (h-20)                  │
│  ├── Nav items (py-6 px-4 space-y-1)                │
│  │     Active: bg-[accent] text-white               │
│  │     Default: text-stone-600 hover:bg-stone-50    │
│  └── Footer: lang toggle + logout (p-4 border-t)   │
│                                                     │
│  Main (flex-1 flex-col h-screen overflow-hidden)    │
│  ┌── Topbar (h-20 white border-b stone-200)         │
│  │     Mobile burger | Global search | Bell + Avatar│
│  └── Content (flex-1 overflow-auto p-4 md:p-8)     │
│        <Outlet /> renders each page here            │
└─────────────────────────────────────────────────────┘
```

---

## Components

### Stat Cards (Overview Row)
- `bg-white` + `border border-stone-100` + `shadow-sm` + `rounded-2xl` + `p-6`
- Icon chip: coloured tonal background (`bg-blue-50`, `bg-green-50`, `bg-purple-50`, `bg-[accent]/10`) with matching icon colour
- Value: `text-3xl font-bold text-[primary]`
- Sub-label: `text-sm font-medium` in the chip's accent colour

### Data Cards (Charts, Tables, Widgets)
- Same shell as Stat Cards
- Section heading: `text-lg font-medium text-stone-800`
- All share `bg-white rounded-2xl border border-stone-100 shadow-sm p-6`

### Navigation Items (Sidebar)
- Active: `bg-[var(--color-accent)] text-white rounded-lg px-3 py-3`
- Hover: `hover:bg-stone-50 hover:text-[var(--color-primary)]`
- Icon: `w-5 h-5 flex-shrink-0`
- Label: `font-medium text-sm`

### Buttons
- **Primary:** `bg-[primary] text-white rounded-xl px-4 py-2 hover:bg-[accent]`
- **Secondary:** `bg-stone-100 text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-200`
- **Dark/Export:** `bg-stone-800 text-white rounded-xl hover:bg-stone-700`
- **Danger (Logout):** `text-red-600 hover:bg-red-50 rounded-lg`
- **Inline action:** `text-xs px-2 py-1 bg-[primary] text-white rounded hover:bg-[accent]`

### Status Badges
- Pending: `bg-yellow-100 text-yellow-700 rounded-md px-2 py-1 text-xs font-medium`
- Shipped: `bg-green-100 text-green-700 rounded-md px-2 py-1 text-xs font-medium`
- Count badge: `px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md`
- Type pill (search): `text-[10px] font-bold tracking-wider uppercase bg-stone-100 text-stone-600 px-2 py-1 rounded`

### Table
- Header row: `bg-stone-50 border-b border-stone-100 text-sm text-stone-500 font-medium p-3`
- Body rows: `divide-y divide-stone-100 hover:bg-stone-50`
- Cell text: `text-[primary] font-medium` for key values, `text-stone-500 text-sm` for secondary

### Form Inputs & Selects
- `bg-stone-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[accent] text-sm` (search in topbar)
- `bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[accent] text-sm` (page-level filters)
- Select: same style as input

### Smart Insight Cards
- Positive: `bg-green-50 border border-green-100 text-green-800 rounded-xl p-4`
- Warning: `bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl p-4`
- Info: `bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-4`

### Low Stock / Alert Item
- `border border-red-100 bg-red-50/30 rounded-xl p-3`
- Name: `font-medium text-[primary] text-sm`
- Stock count: `text-xs text-red-500 font-medium`
- Action link: `text-xs font-bold text-[accent] uppercase tracking-wider px-2 py-1 bg-white border border-stone-200 rounded`

### Modal / Overlay
- Backdrop: `bg-stone-900/50 backdrop-blur-sm`
- Panel: `bg-white rounded-2xl shadow-xl`
- Header: `border-b border-stone-100 p-6`
- Body: `p-6 overflow-y-auto`

### Global Search Dropdown
- Container: `bg-white border border-stone-100 shadow-lg rounded-xl overflow-hidden z-50`
- Item: `flex items-center justify-between p-3 hover:bg-stone-50 border-b border-stone-50 last:border-none`
- Max height: `max-h-80 overflow-y-auto`

### Theme Selector Cards (Settings)
- Default: `border-2 border-stone-100 rounded-2xl p-6 hover:border-stone-200 hover:bg-stone-50`
- Active: `border-2 border-[accent] bg-stone-50 rounded-2xl p-6`
- Active checkmark: `CheckCircle2 absolute top-4 right-4 text-[accent]`
- Colour swatch: `w-8 h-8 rounded-full shadow-sm border border-stone-200`

---

## Charts (Recharts)

### AreaChart
- Background grid: `strokeDasharray="3 3" vertical={false} stroke="#f5f5f4"`
- Axis ticks: `fill: "#78716c" fontSize: 12` (stone-500)
- Area stroke: `var(--color-accent)` strokeWidth 3
- Gradient fill: 30% opacity at top → 0% at bottom

### PieChart (donut)
- innerRadius 60, outerRadius 90, paddingAngle 5
- Colors: `["#eab308", "#22c55e"]` (yellow-500 for pending, green-500 for shipped)
- Legend: `verticalAlign="bottom" height={36}`

### Tooltip style
```js
contentStyle: {
  borderRadius: "12px",
  border: "1px solid #e7e5e4",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
}
```

---

## CSS Variables in Use

```css
:root {
  --color-primary: #1C1C1C;   /* default theme */
  --color-accent:  #8C7A6B;   /* default theme */
}

[data-theme="ocean"]  { --color-primary: #0F2C59; --color-accent: #DAC0A3; }
[data-theme="forest"] { --color-primary: #1A3636; --color-accent: #D6BD98; }
[data-theme="sunset"] { --color-primary: #451952; --color-accent: #F39F5A; }
```

These are applied to `document.documentElement.dataset.theme` via a Firestore listener in `App.tsx`, making the theme live-switchable for all users.
