# Design: Admin-Uploadable Global Font

Date: 2026-07-12
Status: Approved (pending spec review)
Related: [docs/design.md](../../design.md) §3.3 Typography

## Problem

The admin should be able to upload a font file (`.ttf`, and other web font
formats) from the Settings page, and that font should become the typeface for
the **entire** app — storefront and admin, English and Arabic.

Two obstacles today:

1. **Fonts are not actually global.** `--font-serif` / `--font-sans` are meant
   to be the single source of truth ([src/index.css](../../../src/index.css)),
   but ~100 rules across storefront pages hardcode `font-family: "Maj"` in inline
   `<style>` blocks, so they ignore the variable. A font change (built-in or
   uploaded) does not reach them.
2. **Uploaded fonts are unknown at build time.** The current fonts are baked into
   `index.css` via static `@font-face`. An uploaded font's `@font-face` must be
   injected at runtime, pointing at the uploaded file's URL.

## Goals

- Storefront + admin typography is driven entirely by the global CSS variables
  `--font-serif` / `--font-sans`.
- An admin can upload one custom font from Settings; it applies app-wide,
  immediately, for all visitors.
- Built-in **Maj** and **Majalla** remain selectable; **Maj** becomes the
  app-wide default.
- Arabic always renders, even if the uploaded font is Latin-only.

## Non-Goals

- A multi-font library (multiple named uploads, delete/manage). Single custom
  slot only; uploading replaces the previous custom font. (Chosen explicitly.)
- Converting `Landing.tsx` (`/landing`) — it keeps its bespoke Cormorant
  Garamond / Montserrat identity.
- Touching the dead backup files `Landing2 copy.tsx` / `Landing2 copy 2.tsx`
  (unrouted).
- Per-user font selection. Font is global, server-stored, as today.

## Decisions (locked with the user)

| Decision | Choice |
|----------|--------|
| Font management model | **Single custom slot** (one uploaded font at a time; upload replaces) |
| Refactor breadth | **Full** — all active storefront pages follow the global var; `/landing` excluded |
| App-wide default font | **Maj** (preserves the current storefront look; admin default shifts Majalla → Maj; Majalla stays selectable) |

---

## Architecture

### Data flow

```
Admin Settings ──upload .ttf──▶ POST /api/admin/settings/font/upload
                                   │ save file to UPLOAD_DIR
                                   │ setting.font = { selectedFont:"custom",
                                   │                   custom:{ name, url } }
                                   ▼
                              GET /api/settings/font ──▶ App.tsx (on load)
                                   { selectedFont, custom }
                                          │
                     inject @font-face("AppCustomFont", url)  (if custom)
                     set <html data-font=selectedFont>
                                          │
              index.css [data-font] blocks set --font-serif / --font-sans
                                          │
       every component reads var(--font-serif) / var(--font-sans)  ← the refactor
```

### The fixed-family-name trick

Only the font **file URL** is dynamic; the **CSS family name is constant**
(`"AppCustomFont"`). This keeps almost everything static:

- `index.css` gains one static block:
  ```css
  [data-font="custom"] {
    --font-serif: "AppCustomFont", "Maj", "Cairo", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
    --font-sans:  "AppCustomFont", "Maj", "Cairo", ui-sans-serif, system-ui, sans-serif;
  }
  html[data-font="custom"] { font-size: 16px; }
  ```
  The `"Maj", "Cairo"` fallbacks are the **Arabic safety net** — non-negotiable,
  because an uploaded `.ttf` may cover Latin only.
- Runtime only injects the `@font-face` descriptor for `"AppCustomFont"` with the
  uploaded `src`. No dynamic variable names, no rebuild.

---

## Components

### Server (`server/src`)

**`routes/admin.routes.ts`**

- New multer instance `fontUpload` — disk storage into `UPLOAD_DIR`, `fileFilter`
  validates by **file extension** (`.ttf`, `.otf`, `.woff`, `.woff2`), because
  font mimetypes are unreliable (`font/ttf`, `application/octet-stream`, or empty
  depending on OS/browser). 10 MB limit (matches images).
- New route `POST /api/admin/settings/font/upload` (field `file`):
  1. Reject if no file / bad extension (400).
  2. Read current `font` setting.
  3. Best-effort `fs.unlink` of the previous `custom` file (only if it is under
     `UPLOAD_DIR`), to avoid orphan accumulation on replace.
  4. Upsert `font` = `{ selectedFont: "custom", custom: { name, url } }` where
     `name` = original filename without extension, `url` =
     `${PUBLIC_BASE_URL||req origin}/uploads/<stored>`.
  5. `recordAudit(update, entity:"font", …)`.
  6. Return `{ selectedFont, custom }`.
- Modify `PUT /api/admin/settings/font` to **merge**: read existing value, set
  `selectedFont` from body, **preserve existing `custom`** unless the body
  explicitly sends one. This prevents wiping the uploaded font when the admin
  clicks Maj/Majalla and later returns to Custom. Return `{ selectedFont, custom }`.

**`routes/catalog.routes.ts`**

- `GET /api/settings/font` returns `{ selectedFont: value?.selectedFont ?? "default", custom: value?.custom ?? null }`.

No CORS changes: `/uploads` is already served by `express.static` behind the
global `cors()` middleware, so font requests (which are always CORS-mode) receive
`Access-Control-Allow-Origin` for whitelisted origins. In production everything is
same-origin.

### Client (`src`)

**`lib/customFont.ts`** (new)

- `applyCustomFont(url: string): void` — creates or updates a single
  `<style id="app-custom-font-face">` element containing
  `@font-face { font-family: "AppCustomFont"; src: url("<url>") format("<derived>"); font-display: swap; }`.
  Idempotent (updates in place). Format derived from the URL extension; omit
  `format()` if unknown.

**`lib/api/catalog.ts`**

- `FontSettings` becomes `{ selectedFont: string | null; custom?: { name: string; url: string } | null }`.

**`lib/api/admin.ts`**

- `uploadFont(file: File): Promise<FontSettings>` — multipart POST to
  `/api/admin/settings/font/upload` (reuses the `auth: true` FormData pattern of
  `uploadImage`). `updateFont` unchanged.

**`App.tsx`**

- In the existing `getFont()` effect: if `font.custom?.url`, call
  `applyCustomFont(font.custom.url)` **before** setting `dataset.font`; then set
  `document.documentElement.dataset.font = font.selectedFont ?? "default"`.

**`index.css`**

- Flip `@theme` defaults to Maj-first:
  ```css
  --font-serif: "Maj", "Playfair Display", "Cairo", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans:  "Maj", "Inter", "Cairo", ui-sans-serif, system-ui, sans-serif;
  ```
- Base font-size becomes `html { font-size: 16px }` (Maj's natural size);
  `html[data-font="majalla"] { font-size: 17.5px }` (Majalla's smaller x-height);
  keep `html[data-font="maj"] { 16px }`.
- Keep `[data-font="maj"]` and `[data-font="majalla"]` blocks (backward compat
  with saved values). Add the `[data-font="custom"]` block above.

**`pages/admin/Settings.tsx`**

- Replace the two-item font array with three cards: `default` (**Maj
  (Default)**), `majalla` (**Majalla**), `custom` (**Custom**). Card id
  `default` matches the value the server returns on first load (so the Maj card
  highlights correctly); `data-font="default"` has no `[data-font]` block and
  therefore resolves to the `@theme` default (Maj). The legacy `[data-font="maj"]`
  block stays for any previously saved `"maj"` value.
- The Custom card:
  - Hidden `<input type="file" accept=".ttf,.otf,.woff,.woff2">` + an "Upload
    font" button.
  - On file select: `uploadFont(file)` → on success `applyCustomFont(url)` (live
    preview) → `setSelectedFont("custom")` → toast; errors via `handleApiError`.
  - When a custom font exists, show its `name` and a preview line styled
    `fontFamily: "AppCustomFont"`; clicking the card activates it via the
    existing `handleSaveFont("custom")`.
- Card preview `fontFamily` per card: `default` → `"Maj"`, `majalla` →
  `"'Sakkal Majalla','Majalla'"`, `custom` → `"AppCustomFont"`.

### Refactor (make the var authoritative)

Mechanical replacements in the inline `<style>`/`fontFamily` of the active pages
(`Cart`, `Categories`, `CategoryView`, `ContactUs`, `Products`, `ProductView`,
`Landing2`, `Layout`, `MobileMenu`):

- `font-family: "Maj", serif;` → `font-family: var(--font-serif);`
- `font-family: "Maj", sans-serif;` → `font-family: var(--font-sans);`
- inline `fontFamily: "'Maj', serif"` → `fontFamily: "var(--font-serif)"`

Rationale for serif↔serif / sans↔sans: preserves each rule's existing intent;
both currently resolve to Maj, so no visible change under the Maj default, but the
rule now tracks whatever font is selected.

---

## Error handling

- Upload with no file or disallowed extension → 400, surfaced by
  `handleApiError` as a toast; no state change.
- Upload/network failure in Settings → toast; card stays on prior selection.
- `getFont()` failure in `App.tsx` → existing catch sets `data-font="default"`;
  custom simply not applied (falls back to Maj).
- Missing/absent custom file at runtime → `@font-face` fails silently; the
  `"Maj", "Cairo"` fallbacks in `[data-font="custom"]` render text correctly.

## Persistence note (verify during implementation)

The uploaded font lives in `UPLOAD_DIR`, the same directory as product images. A
vanished font would fall back to Maj (not a broken page), but to keep the custom
font across VPS redeploys, confirm `UPLOAD_DIR` persistence is handled the same
way product-image uploads already are.

## Testing strategy

**Server**
- `POST /settings/font/upload`: rejects missing file and bad extension (400);
  accepts `.ttf` and persists `{ selectedFont:"custom", custom:{name,url} }`.
- `PUT /settings/font`: switching to `maj` preserves an existing `custom`.
- Use `supertest` if already a dependency; otherwise unit-test the
  extension-validation and merge helpers in isolation.

**Client**
- `applyCustomFont` injects exactly one `<style id="app-custom-font-face">` and
  updates it in place on a second call (no duplicates).

**Manual (verification-before-completion)**
- Run the app. In Admin → Settings, upload `public/fonts/maj.ttf` (or
  `majalla.ttf`) as the custom font.
- Confirm the face applies across a storefront page and an admin page, in **both
  English and Arabic (RTL)**.
- Switch to Majalla, then back to Custom — custom persists.
- Playwright screenshot of storefront + admin under the custom font.

## Rollout / order of work

1. `index.css` — flip default to Maj, add `[data-font="custom"]`, font-size rules.
2. Server — `GET`/`PUT` font shape, upload route + `fontUpload` multer.
3. Client plumbing — `FontSettings` type, `uploadFont`, `customFont.ts`, `App.tsx`.
4. Settings UI — three cards + upload.
5. Storefront refactor — replace hardcoded `"Maj"` with the vars.
6. Tests + manual verification in EN and AR.
