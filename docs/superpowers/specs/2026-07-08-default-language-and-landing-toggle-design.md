# Default Site Language + Landing Page Language Toggle — Design Spec

**Date:** 2026-07-08
**Status:** Approved (brainstorming, defaults auto-selected per user's "proceed") → ready for implementation plan

## Summary

Two related asks:

1. The storefront should **default to Arabic**, adjustable from the admin
   Settings page — mirroring the existing Theme/Font global settings pattern.
2. `Landing2.tsx` (served at `/`, the main marketing landing page) needs a
   **language toggle button in its navbar**, next to the "Shop Now" CTA.

Investigation found `Landing2.tsx` is currently 100% hardcoded English and
never touches `react-i18next` — unlike the rest of the app (Products, Cart,
Checkout, admin pages), which is already fully wired to `src/i18n.ts`
(`ar`/`en` resources, `fallbackLng: "ar"`). A working per-visitor toggle
already exists elsewhere (`Layout.tsx`, `MobileMenu.tsx` — a gold-outline pill
button reading `i18n.changeLanguage(...)`, cached by
`i18next-browser-languagedetector` in `localStorage`).

Also discovered: `i18n.ts` already contains Arabic/English translation pairs
for almost all of `Landing2`'s copy (`shop_now`, `the_art_of_details`,
`immersive`, `shop_by_category`, `our_heritage`, etc.) that are **currently
unused anywhere in the codebase** — evidence this page was wired to i18n at
some point and reverted. This makes full translation cheap: most keys already
exist, only ~10 short strings need new key pairs.

## Decisions

The three open questions below were queued for user confirmation via
`AskUserQuestion`; the tool call errored out before the user could answer, and
the user then said "proceed love." Given that, and per the recommended option
already framed for each question, this spec locks in:

- **Landing2 translation scope — fully bilingual.** Wire `Landing2.tsx` to
  the existing i18n keys (adding the small number of missing ones) so the
  toggle actually translates the hero, signature section, categories, story,
  and footer. Layout stays **LTR** — nothing else in this codebase mirrors to
  RTL even in Arabic mode (`Layout.tsx` hardcodes `dir = "ltr"` regardless of
  `i18n.language`), so `Landing2` follows the same convention: only text
  swaps, no flex-direction/text-align/mirroring changes.
- **Default-language scope — new visitors only.** The admin setting decides
  what a first-time visitor (no cached language preference) sees. A visitor
  who has already used the existing toggle keeps their own choice on return
  visits — this preserves the toggle's value instead of fighting it every
  page load (which is how Theme/Font behave today, but they have no
  per-visitor override to begin with).
- **Toggle visual — text pill.** Match the exact style already used in
  `Layout.tsx`/`MobileMenu.tsx`: a gold-outlined pill labeled with the
  language you'd switch **to** (`EN` when currently Arabic, `عربي` when
  currently English). Keeps the whole site visually consistent; no new icon
  pattern introduced.

## Architecture

### 1. Backend — new `Setting` row, same shape as theme/font

`server/prisma/schema.prisma`'s `Setting` model (`id: String, value: Json`)
needs no migration — just a new row, `id = "language"`.

- `GET /api/settings/language` (public, `catalog.routes.ts`) → `{ defaultLanguage: "ar" | "en" }`, defaulting to `"ar"` when the row doesn't exist yet. Mirrors `GET /api/settings/theme`/`font` exactly.
- `PUT /api/admin/settings/language` (`admin.routes.ts`, admin-authenticated like `theme`/`font`) → upserts `{ defaultLanguage }`, validates it's `"ar"` or `"en"`.

### 2. Frontend API layer

- `catalog.ts`: `getLanguageSettings(): Promise<{ defaultLanguage: string }>`.
- `admin.ts`: `updateLanguage(defaultLanguage: string)` → `PUT /api/admin/settings/language`.

### 3. i18n bootstrap — admin default applies only when nothing is cached

Today, `i18next-browser-languagedetector`'s default detector order includes
`navigator` (browser locale) ahead of the `fallbackLng`, so an English-browser
first-time visitor currently sees English, not Arabic — the admin has no way
to change that. Fix:

- `i18n.ts`: constrain `detection.order` to `['querystring', 'localStorage', 'cookie']` (drop `navigator`/`htmlTag`), keep `caches: ['localStorage']`. `fallbackLng` stays `"ar"` as the last-resort default before the admin setting loads.
- `App.tsx`'s existing bootstrap `useEffect` (which already fetches `getTheme()`/`getFont()`) also fetches `getLanguageSettings()`. If `localStorage.getItem('i18nextLng')` is `null` (no prior visitor choice), call `i18n.changeLanguage(defaultLanguage)`. If a cached value exists, leave it alone — that visitor already made their own choice via the toggle.

### 4. Admin Settings UI

`src/pages/admin/Settings.tsx` gets a new card, "Default Language", placed
alongside the existing Theme/Font cards and following their exact
visual/interaction pattern (two option buttons — Arabic / English — active
state ring, `toast.success` on save, calls `updateLanguage`).

### 5. `Landing2.tsx` — wire to i18n, add the toggle

- Add `const { t, i18n } = useTranslation();`.
- Replace hardcoded strings with `t('key')`, reusing existing keys:
  `jamhawi`, `shop_now`, `the_art_of_details`, `immersive`, `purity`,
  `discover_more`, `scroll`, `signature_harvest`, `a_symphony_of`,
  `hand_selected`, `est_1984` / `est_1984_2`, `pure_origin`,
  `cultivated_in_the_world_renowned_mineral`,
  `each_date_undergoes_rigorous_inspection_`, `jamhawi_gold`,
  `limited_edition_harvest_2`, `our_collection`, `shop_by_category`,
  `our_heritage`, `a_legacy_of_pure_taste`, `browse_the_store`,
  `subscribe_to_the_club`, `receive_exclusive_access_to_seasonal_har`,
  `join`, `privacy_policy`, `terms_of_service`, `shop`.
- Add ~10 new key pairs (ar/en) to `i18n.ts` for strings with no existing
  match: hero subtitle paragraph, hero title second line ("Texture &
  Taste"), the signature-section body paragraph, the "100% Natural" chip,
  the "Explore" category-card CTA (not in `i18n.ts` at all today), the 4
  `subMapping` category blurbs + its "Premium Selection" fallback, the story
  body paragraph, the newsletter email placeholder, and the footer copyright
  line.
- Category display name: switch from hardcoded `cat.name` to
  `i18n.language === "ar" ? cat.nameAr || cat.name : cat.name`, matching the
  convention already used in `Categories.tsx:369`.
- Add the toggle button in the `<header className="an-nav">`, between the
  brand link and the `Shop Now` link:
  `<button onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")}>{i18n.language === "ar" ? "EN" : "عربي"}</button>`,
  styled as a new `.an-lang-toggle` class visually consistent with
  `.an-nav-cta` (gold 1px outline pill) but with transparent-on-idle /
  filled-on-hover kept subtler so it doesn't visually compete with the
  primary Shop Now CTA.

No RTL changes anywhere in this feature — confirmed as out of scope per the
locked-in decision above.

## Error handling

- `getLanguageSettings()` failure on boot → same pattern as theme/font: catch
  and fall through to whatever `i18n` already resolved (cached choice or
  `fallbackLng` "ar"), no user-facing error.
- `updateLanguage()` failure in admin UI → `toast.error`, matching
  `updateTheme`/`updateFont` failure handling.
- Missing i18n key at runtime → `react-i18next` renders the key itself in dev;
  this is caught by the self-review pass, not by runtime error handling.

## Testing

- Manual: toggle button on `/` (Landing2) flips visible copy between EN/AR
  without layout breakage; toggle in `Layout.tsx`/`MobileMenu.tsx` stays in
  sync (same `i18n` instance).
- Manual: clear `localStorage`, load `/` with no admin override → Arabic.
  Set admin default to English, clear `localStorage` again → English.
  Toggle language as a visitor, reload → visitor's choice persists over the
  admin default.
- No automated test suite currently covers i18n or Landing2; not adding one
  now (matches existing test coverage scope in `src/tests/`, which is
  pricing/currency-focused only).
