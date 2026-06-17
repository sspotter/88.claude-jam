---
name: Artisanal Noir
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#dec1ac'
  on-secondary: '#3f2d1e'
  secondary-container: '#574333'
  on-secondary-container: '#ccb09c'
  tertiary: '#d0cdcd'
  on-tertiary: '#313030'
  tertiary-container: '#b4b2b2'
  on-tertiary-container: '#454544'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#fbddc7'
  secondary-fixed-dim: '#dec1ac'
  on-secondary-fixed: '#28180b'
  on-secondary-fixed-variant: '#574333'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Bodoni Moda
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-desktop: 80px
  margin-mobile: 24px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 48px
---

## Brand & Style
The design system is a manifestation of ultra-premium craftsmanship, drawing inspiration from high-end artisanal food packaging. The personality is authoritative, sophisticated, and deeply rooted in heritage. It targets a discerning audience that values quality over quantity, seeking an emotional experience that feels exclusive and timeless.

The visual style is **Minimalist / High-Contrast**, leaning into a dark-mode-first architecture. It utilizes heavy negative space to allow gold accents and rich photography to command attention. The "Jamhawi" aesthetic is achieved through a combination of traditional serif elegance and modern geometric precision, creating a "Modern-Vintage" hybrid that feels both established and contemporary.

## Colors
The palette is anchored in a monochromatic dark base to ensure gold elements appear luminescent. 

- **Primary (Metallic Gold):** Used sparingly for interactive elements, borders, and brand-critical typography to evoke luxury.
- **Secondary (Burnt Umber):** A rich, wood-inspired tone used for depth in backgrounds or subtle UI separators, mirroring the artisanal date jam jars.
- **Neutral (Obsidian & Charcoal):** The foundation of the UI. Backgrounds should use `#0D0D0D` while surfaces and containers use `#1A1A1A`.
- **Text:** Headlines utilize the primary gold or a high-contrast off-white (#F5F5F5), while body text remains a muted silver-grey (#A0A0A0) to maintain hierarchy.

## Typography
Typography is the primary driver of the brand's sophisticated tone. **Bodoni Moda** is selected for headlines to provide high-contrast serifs that feel editorial and expensive. **Manrope** provides a clean, modern counterpoint for body copy, ensuring legibility without distracting from the brand's character.

Key treatments:
- **Serif Headlines:** Always used for product names and hero sections.
- **Micro-copy:** Small, uppercase Manrope labels with generous letter spacing (10%) are used for secondary details, mimicking the "Premium Quality" insignias on the packaging.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain an editorial, "lookbook" feel. Content is centered within a 1280px container to ensure visual focus. 

- **Breathing Room:** Use aggressive vertical spacing (stack-lg) between sections to convey a sense of luxury; luxury doesn't crowd.
- **Asymmetry:** Occasionally break the grid with large product imagery that bleeds off the edge of the screen to create dynamic energy.
- **Mobile:** Transition to a single-column layout with 24px side margins, prioritizing large-scale imagery and high-contrast gold-on-black text blocks.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Subtle Inner Glows** rather than traditional drop shadows.

- **Surfaces:** Use a slight gradient from `#1A1A1A` to `#0D0D0D` to give cards a subtle "molded" look, reminiscent of the premium gift boxes.
- **Borders:** Instead of shadows, use 1px solid borders in a muted gold (`#D4AF37` at 20% opacity) or the Secondary Umber tone to define edges.
- **Backdrop:** Use heavy background blurs (32px+) when overlays or modals appear to maintain the dark, moody atmosphere while focusing the user.

## Shapes
The shape language is structured and precise. A **Soft (0.25rem)** roundedness is applied to buttons and inputs to keep the design from feeling too clinical, but it remains sharp enough to feel architectural and high-end.

- **Circular Accents:** Use perfect circles for profile avatars and decorative stamps (like the "Uncle Jam" seal) to create a visual contrast against the rectangular layout grid.
- **Framing:** Use ornate, thin-line gold frames for featured products, referencing the traditional decorative linework found on the jam jar labels.

## Components
### Buttons
Primary buttons are solid Gold with Black text, using bold Manrope caps. Secondary buttons are "Ghost" style with a thin Gold border and no fill. All buttons feature a slight gold outer glow on hover.

### Cards
Cards utilize the Obsidian neutral color as a base with a very subtle Wood-tone (Secondary) top-border. Product cards should feature high-shadow photography that "pops" off the dark background.

### Input Fields
Fields are dark-on-dark. Use a `#1A1A1A` background with a bottom-only border in muted gold. The label floats above in small-caps Manrope when the field is active.

### Chips & Tags
Used for product attributes like "100% Natural" or "Hand-Selected." These are styled as small, pill-shaped outlines with gold text and no background fill.

### Dividers
Dividers are never pure white or grey. Use a 1px line in the Secondary Umber tone or a horizontal gold-to-transparent gradient for a more decorative, premium transition.