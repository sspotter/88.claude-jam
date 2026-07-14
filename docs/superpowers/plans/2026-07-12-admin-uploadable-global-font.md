# Admin-Uploadable Global Font — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin upload a custom font file from Settings that becomes the typeface for the entire app (storefront + admin, EN + AR), and make the global CSS variables `--font-serif` / `--font-sans` the single source of truth so any font selection actually propagates everywhere.

**Architecture:** The font choice is stored server-side in the `font` setting as `{ selectedFont, custom }`. `App.tsx` reads it, injects a runtime `@font-face` for the fixed CSS family `"AppCustomFont"` when a custom font exists, and sets `<html data-font=...>`. Static `[data-font]` blocks in `index.css` map each selection to `--font-serif` / `--font-sans`, which every component reads via `var(...)`. The default resolves to Maj.

**Tech Stack:** React + TypeScript + Vite (frontend), Express + Prisma + multer (server), Tailwind CSS v4, vitest (server tests).

**Design doc:** [docs/superpowers/specs/2026-07-12-admin-uploadable-global-font-design.md](../specs/2026-07-12-admin-uploadable-global-font-design.md)

**Conventions in this repo:**
- Server is ESM: local imports use the `.js` extension even for `.ts` files (e.g. `import x from "./foo.js"`).
- Server tests are colocated `*.test.ts` run with `npm test --prefix server` (vitest).
- Frontend dev: `npm run dev` (web on `http://localhost:3007`, API on `http://localhost:5000`). Typecheck: `npm run lint` (root, `tsc --noEmit`).
- Uploads: multer disk storage into `UPLOAD_DIR` (default `uploads`, relative to the server cwd), served at `/uploads` via `express.static` behind the global `cors()` middleware.

---

### Task 1: CSS — flip default to Maj, add custom-font block, adjust base sizes

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Flip the `@theme` default font stacks to Maj-first**

In `src/index.css`, replace the two font lines inside the `@theme { … }` block:

```css
  --font-serif: "Sakkal Majalla", "Majalla", "Playfair Display", "Cairo", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans: "Sakkal Majalla", "Majalla", "Inter", "Cairo", ui-sans-serif, system-ui, sans-serif;
```

with:

```css
  --font-serif: "Maj", "Playfair Display", "Cairo", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans: "Maj", "Inter", "Cairo", ui-sans-serif, system-ui, sans-serif;
```

- [ ] **Step 2: Add the `[data-font="custom"]` override block**

Immediately after the existing `[data-font="majalla"] { … }` block (ends around line 31), add:

```css
/* Uploaded custom font. Only the @font-face src is injected at runtime
   (src/lib/customFont.ts); the family name "AppCustomFont" is constant.
   Maj + Cairo are kept as the Arabic fallback — an uploaded .ttf may be
   Latin-only. */
[data-font="custom"] {
  --font-serif: "AppCustomFont", "Maj", "Playfair Display", "Cairo", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans: "AppCustomFont", "Maj", "Inter", "Cairo", ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 3: Update the base font-size rules so Maj is the 16px default**

Replace this block:

```css
html {
  font-size: 17.5px;
}
html[data-font="maj"] {
  font-size: 16px;
}
```

with:

```css
html {
  font-size: 16px;
}
/* Sakkal Majalla has a small x-height, so nudge it up when selected. */
html[data-font="majalla"] {
  font-size: 17.5px;
}
html[data-font="maj"] {
  font-size: 16px;
}
html[data-font="custom"] {
  font-size: 16px;
}
```

- [ ] **Step 4: Verify the file still parses (build the CSS via typecheck-adjacent check)**

Run: `npm run lint`
Expected: PASS (no TypeScript errors; CSS is not type-checked but this confirms nothing else broke). Visually confirm the three edits are present.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(fonts): make Maj the global default and add custom-font CSS block"
```

---

### Task 2: Server — font-settings helpers (TDD)

**Files:**
- Create: `server/src/services/fontSettings.ts`
- Test: `server/src/services/fontSettings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/services/fontSettings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  isAllowedFontExtension,
  mergeFontSelection,
  ALLOWED_FONT_EXTENSIONS,
} from "./fontSettings.js";

describe("isAllowedFontExtension", () => {
  it("accepts .ttf/.otf/.woff/.woff2 case-insensitively", () => {
    expect(isAllowedFontExtension("brand.ttf")).toBe(true);
    expect(isAllowedFontExtension("BRAND.TTF")).toBe(true);
    expect(isAllowedFontExtension("brand.otf")).toBe(true);
    expect(isAllowedFontExtension("brand.woff")).toBe(true);
    expect(isAllowedFontExtension("brand.woff2")).toBe(true);
  });

  it("rejects non-font extensions and extensionless names", () => {
    expect(isAllowedFontExtension("brand.png")).toBe(false);
    expect(isAllowedFontExtension("brand.ttf.exe")).toBe(false);
    expect(isAllowedFontExtension("noext")).toBe(false);
  });

  it("exposes the allowed list", () => {
    expect(ALLOWED_FONT_EXTENSIONS).toContain(".ttf");
  });
});

describe("mergeFontSelection", () => {
  it("preserves an existing custom font when switching selection", () => {
    const existing = { selectedFont: "custom", custom: { name: "Brand", url: "/uploads/x.ttf" } };
    expect(mergeFontSelection(existing, "maj")).toEqual({
      selectedFont: "maj",
      custom: { name: "Brand", url: "/uploads/x.ttf" },
    });
  });

  it("returns custom: null when there is no existing custom font", () => {
    expect(mergeFontSelection({ selectedFont: "default" }, "majalla")).toEqual({
      selectedFont: "majalla",
      custom: null,
    });
    expect(mergeFontSelection(null, "default")).toEqual({
      selectedFont: "default",
      custom: null,
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --prefix server -- fontSettings`
Expected: FAIL — cannot resolve `./fontSettings.js`.

- [ ] **Step 3: Implement the helpers**

Create `server/src/services/fontSettings.ts`:

```ts
export const ALLOWED_FONT_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"] as const;

export interface CustomFont {
  name: string;
  url: string;
}

export interface FontSettingValue {
  selectedFont: string;
  custom: CustomFont | null;
}

/**
 * Validate an uploaded font by file extension. Font mimetypes are unreliable
 * (font/ttf, application/octet-stream, or empty depending on OS/browser), so we
 * key off the extension only.
 */
export function isAllowedFontExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_FONT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Build the next `font` setting value when only the selection changes, keeping
 * any previously uploaded custom font so it isn't wiped by picking Maj/Majalla.
 */
export function mergeFontSelection(existing: unknown, selectedFont: string): FontSettingValue {
  const prev = (existing ?? {}) as { custom?: CustomFont | null };
  return { selectedFont, custom: prev.custom ?? null };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --prefix server -- fontSettings`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/fontSettings.ts server/src/services/fontSettings.test.ts
git commit -m "feat(fonts): add font-settings validation and merge helpers"
```

---

### Task 3: Server — GET/PUT font shape + custom-font upload route

**Files:**
- Modify: `server/src/routes/catalog.routes.ts` (GET `/settings/font`)
- Modify: `server/src/routes/admin.routes.ts` (PUT `/settings/font`, new POST `/settings/font/upload`, imports)

- [ ] **Step 1: Return `custom` from the public GET**

In `server/src/routes/catalog.routes.ts`, replace the `GET /settings/font` handler body:

```ts
router.get("/settings/font", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "font" } });
    const value = (setting?.value as { selectedFont?: string } | null) ?? null;
    return res.json({ selectedFont: value?.selectedFont ?? "default" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch font." });
  }
});
```

with:

```ts
router.get("/settings/font", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "font" } });
    const value =
      (setting?.value as { selectedFont?: string; custom?: { name: string; url: string } | null } | null) ?? null;
    return res.json({
      selectedFont: value?.selectedFont ?? "default",
      custom: value?.custom ?? null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch font." });
  }
});
```

- [ ] **Step 2: Import the font helpers into admin routes**

In `server/src/routes/admin.routes.ts`, add after the `recordAudit` import (line 19):

```ts
import { isAllowedFontExtension, mergeFontSelection } from "../services/fontSettings.js";
```

- [ ] **Step 3: Make PUT `/settings/font` merge-preserve the custom font**

In `server/src/routes/admin.routes.ts`, replace the `PUT /settings/font` handler:

```ts
router.put("/settings/font", async (req: Request, res: Response) => {
  try {
    const selectedFont = String(req.body?.selectedFont ?? "");
    if (!selectedFont) return res.status(400).json({ error: "selectedFont is required." });
    await prisma.setting.upsert({
      where: { id: "font" },
      update: { value: { selectedFont } },
      create: { id: "font", value: { selectedFont } },
    });
    return res.json({ selectedFont });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update font." });
  }
});
```

with:

```ts
router.put("/settings/font", async (req: Request, res: Response) => {
  try {
    const selectedFont = String(req.body?.selectedFont ?? "");
    if (!selectedFont) return res.status(400).json({ error: "selectedFont is required." });
    const existing = (await prisma.setting.findUnique({ where: { id: "font" } }))?.value ?? null;
    const value = mergeFontSelection(existing, selectedFont);
    await prisma.setting.upsert({
      where: { id: "font" },
      update: { value: value as any },
      create: { id: "font", value: value as any },
    });
    return res.json(value);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update font." });
  }
});
```

- [ ] **Step 4: Add the font-upload multer instance and route**

In `server/src/routes/admin.routes.ts`, in the `/* Uploads */` section near the bottom (after the existing `upload` multer instance is defined and after the `POST /uploads` route, but before `export default router;`), add:

```ts
// Fonts get their own multer instance: validation is by extension (font
// mimetypes are unreliable), and files are prefixed "font-" for easy cleanup.
const fontStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `font-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fontUpload = multer({
  storage: fontStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (isAllowedFontExtension(file.originalname)) cb(null, true);
    else cb(new Error("Only font files (.ttf, .otf, .woff, .woff2) are allowed."));
  },
});

// POST /api/admin/settings/font/upload (multipart, field "file").
// Saves the font, sets it as the active custom font, and best-effort deletes
// the previously uploaded font file. The multer middleware is invoked manually
// so filter/size errors return 400 instead of Express's default 500 HTML.
router.post("/settings/font/upload", (req: Request, res: Response) => {
  fontUpload.single("file")(req, res, async (err: unknown) => {
    if (err) return res.status(400).json({ error: (err as Error).message });
    if (!req.file) return res.status(400).json({ error: "No font file uploaded." });
    try {
      const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const url = `${base.replace(/\/$/, "")}/uploads/${req.file.filename}`;
      const name = path.parse(req.file.originalname).name;

      const existing = (await prisma.setting.findUnique({ where: { id: "font" } }))?.value as
        | { custom?: { url?: string } | null }
        | null;

      // Best-effort cleanup of the previous custom font file.
      const prevUrl = existing?.custom?.url;
      if (prevUrl) {
        const prevName = path.basename(prevUrl);
        if (prevName && prevName !== req.file.filename) {
          fs.promises.unlink(path.join(UPLOAD_DIR, prevName)).catch(() => {});
        }
      }

      const value = { selectedFont: "custom", custom: { name, url } };
      await prisma.setting.upsert({
        where: { id: "font" },
        update: { value },
        create: { id: "font", value },
      });
      await recordAudit({
        ...auditActor(req),
        action: "update",
        entity: "font",
        entityId: "font",
        before: existing ?? null,
        after: value,
      });
      return res.status(201).json(value);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to upload font." });
    }
  });
});
```

- [ ] **Step 5: Verify the server compiles**

Run: `npm run build --prefix server`
Expected: PASS (`prisma generate && tsc` completes with no type errors).

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/catalog.routes.ts server/src/routes/admin.routes.ts
git commit -m "feat(fonts): custom-font upload endpoint and merge-preserving font settings"
```

---

### Task 4: Client — FontSettings type, uploadFont API, runtime font injector

**Files:**
- Modify: `src/lib/api/catalog.ts` (`FontSettings` type)
- Modify: `src/lib/api/admin.ts` (`uploadFont`, import)
- Create: `src/lib/customFont.ts`

- [ ] **Step 1: Extend the `FontSettings` type**

In `src/lib/api/catalog.ts`, replace:

```ts
export interface FontSettings {
  selectedFont: string | null;
}
```

with:

```ts
export interface FontSettings {
  selectedFont: string | null;
  custom?: { name: string; url: string } | null;
}
```

- [ ] **Step 2: Create the runtime font injector**

Create `src/lib/customFont.ts`:

```ts
// Injects (and updates in place) a single <style> element that defines the
// @font-face for the uploaded custom font. The CSS family name is constant so
// the rest of the styling stays static (see [data-font="custom"] in index.css).

const STYLE_ID = "app-custom-font-face";
export const CUSTOM_FONT_FAMILY = "AppCustomFont";

function formatFromUrl(url: string): string | null {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".woff2")) return "woff2";
  if (clean.endsWith(".woff")) return "woff";
  if (clean.endsWith(".otf")) return "opentype";
  if (clean.endsWith(".ttf")) return "truetype";
  return null;
}

export function applyCustomFont(url: string): void {
  if (!url) return;
  const fmt = formatFromUrl(url);
  const src = fmt ? `url("${url}") format("${fmt}")` : `url("${url}")`;
  const css = `@font-face { font-family: "${CUSTOM_FONT_FAMILY}"; src: ${src}; font-display: swap; }`;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
```

- [ ] **Step 3: Add the `uploadFont` API call**

In `src/lib/api/admin.ts`, extend the type import on line 2:

```ts
import type { Category, Product, Offer, FontSettings } from "./catalog.js";
```

Then add next to the existing `uploadImage` function (end of file):

```ts
export async function uploadFont(file: File): Promise<FontSettings> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<FontSettings>("/api/admin/settings/font/upload", {
    method: "POST",
    auth: true,
    body: form,
  });
}
```

- [ ] **Step 4: Verify the frontend typechecks**

Run: `npm run lint`
Expected: PASS (no TypeScript errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/catalog.ts src/lib/api/admin.ts src/lib/customFont.ts
git commit -m "feat(fonts): FontSettings.custom, uploadFont API, runtime @font-face injector"
```

---

### Task 5: Client — apply the custom font on app load

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the injector**

In `src/App.tsx`, add after the `getTheme, getFont, ...` import (line 9):

```ts
import { applyCustomFont } from "./lib/customFont";
```

- [ ] **Step 2: Inject the custom @font-face before setting `data-font`**

In `src/App.tsx`, replace the `getFont()` block inside the effect:

```ts
    getFont()
      .then((font) => {
        document.documentElement.dataset.font = font.selectedFont ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.font = "default";
      });
```

with:

```ts
    getFont()
      .then((font) => {
        if (font.custom?.url) {
          applyCustomFont(font.custom.url);
        }
        document.documentElement.dataset.font = font.selectedFont ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.font = "default";
      });
```

- [ ] **Step 3: Verify it typechecks**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(fonts): apply uploaded custom font on app load"
```

---

### Task 6: Admin Settings — three font cards with upload

**Files:**
- Modify: `src/pages/admin/Settings.tsx`

- [ ] **Step 1: Add imports for uploadFont and the injector**

In `src/pages/admin/Settings.tsx`, update the admin API import (line 3) to include `uploadFont`:

```ts
import { updateTheme, updateFont, updateLanguage, getAnalytics, listOffers, importData, uploadFont } from "../../lib/api/admin";
```

Add after the errors import (line 4):

```ts
import { applyCustomFont } from "../../lib/customFont";
```

- [ ] **Step 2: Add state for the custom font and its upload input**

In `AdminSettings`, after `const importInputRef = useRef<HTMLInputElement>(null);` (line 31), add:

```ts
  const [customFont, setCustomFont] = useState<{ name: string; url: string } | null>(null);
  const [uploadingFont, setUploadingFont] = useState(false);
  const fontInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Capture and apply the custom font on load**

In the load effect, replace the `if (font.selectedFont) { setSelectedFont(font.selectedFont); }` block:

```ts
        if (font.selectedFont) {
          setSelectedFont(font.selectedFont);
        }
```

with:

```ts
        if (font.selectedFont) {
          setSelectedFont(font.selectedFont);
        }
        if (font.custom) {
          setCustomFont(font.custom);
          applyCustomFont(font.custom.url);
        }
```

- [ ] **Step 4: Add the upload handler**

Add after the existing `handleSaveFont` function (after line 76):

```ts
  const handleFontUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFont(true);
    try {
      const result = await uploadFont(file);
      if (result.custom) {
        setCustomFont(result.custom);
        applyCustomFont(result.custom.url);
      }
      const next = result.selectedFont ?? "custom";
      setSelectedFont(next);
      document.documentElement.dataset.font = next;
      toast.success("Custom font uploaded and applied for all users");
    } catch (err) {
      handleApiError(err, OperationType.WRITE, "settings/font/upload");
    } finally {
      setUploadingFont(false);
      if (fontInputRef.current) fontInputRef.current.value = "";
    }
  };
```

- [ ] **Step 5: Replace the Global Font card with three cards (Maj / Majalla / Custom)**

Replace the entire "Global Font" white-card `<div>` (the block starting `<div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">` that contains `Global Font`, through its closing `</div>`) with:

```tsx
      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
        <h2 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-3 font-serif">
          <Type className="w-6 h-6 text-stone-600" />
          Global Font
        </h2>
        <p className="text-stone-500 mb-8">
          Select a font family for your storefront and admin dashboard, or upload
          your own font file. This updates the typography across the entire
          website immediately, for all visitors.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "default", name: "Maj (Default)", description: "Default font · supports English & Arabic", family: "Maj", sample: "جمحاوي - Jamhawi" },
            { id: "majalla", name: "Majalla", description: "Elegant classic Arabic font · Sakkal Majalla", family: "'Sakkal Majalla', 'Majalla'", sample: "خط المجلة - Jamhawi" },
          ].map((fontOption) => {
            const isActive = selectedFont === fontOption.id;
            return (
              <button
                key={fontOption.id}
                onClick={() => handleSaveFont(fontOption.id)}
                disabled={savingFont || uploadingFont}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[var(--color-accent)] bg-stone-50"
                    : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                }`}
                style={{ fontFamily: fontOption.family }}
              >
                {isActive && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div className="font-medium text-lg text-stone-800 mb-1 font-serif">
                  {fontOption.name}
                </div>
                <div className="text-xs text-stone-500 mb-4">
                  {fontOption.description}
                </div>
                <div className="text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 font-serif">
                  {fontOption.sample}
                </div>
              </button>
            );
          })}

          {/* Custom uploaded font */}
          <div
            className={`relative p-6 rounded-2xl border-2 text-left transition-all sm:col-span-2 ${
              selectedFont === "custom"
                ? "border-[var(--color-accent)] bg-stone-50"
                : "border-stone-100"
            }`}
          >
            {selectedFont === "custom" && (
              <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
            )}
            <div className="font-medium text-lg text-stone-800 mb-1 font-serif">
              Custom Font
            </div>
            <div className="text-xs text-stone-500 mb-4">
              {customFont ? `Uploaded: ${customFont.name}` : "Upload a .ttf, .otf, .woff or .woff2 file"}
            </div>

            {customFont && (
              <button
                type="button"
                onClick={() => handleSaveFont("custom")}
                disabled={savingFont || uploadingFont}
                className="w-full text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 mb-4 text-left"
                style={{ fontFamily: "AppCustomFont" }}
              >
                خط مخصص - Custom Jamhawi
              </button>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fontInputRef.current?.click()}
                disabled={uploadingFont || savingFont}
                className="px-5 py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploadingFont ? "Uploading..." : customFont ? "Replace font" : "Upload font"}
              </button>
              <input
                type="file"
                ref={fontInputRef}
                onChange={handleFontUpload}
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
```

- [ ] **Step 6: Verify the frontend typechecks**

Run: `npm run lint`
Expected: PASS. (`ChangeEvent`, `useRef`, `Upload`, `Type`, `CheckCircle2` are already imported in this file.)

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/Settings.tsx
git commit -m "feat(fonts): admin Settings custom-font upload with three font cards"
```

---

### Task 7: Storefront — route hardcoded "Maj" through the global variable

**Files:**
- Modify: `src/pages/Cart.tsx`, `src/pages/Categories.tsx`, `src/pages/CategoryView.tsx`, `src/pages/ContactUs.tsx`, `src/pages/Products.tsx`, `src/pages/ProductView.tsx`, `src/pages/Landing2.tsx`, `src/components/Layout.tsx`, `src/components/MobileMenu.tsx`

- [ ] **Step 1: Run the deterministic replacement script**

Write this script to the scratchpad and run it with node from the project root. It performs exactly four literal string replacements (sans variants first so they can't be partially matched) across the nine active files only — `Landing.tsx` and the `Landing2 copy*.tsx` dead files are intentionally excluded.

Create `scripts/tmp-font-refactor.mjs` (or a scratchpad path) with:

```js
import fs from "fs";

const files = [
  "src/pages/Cart.tsx",
  "src/pages/Categories.tsx",
  "src/pages/CategoryView.tsx",
  "src/pages/ContactUs.tsx",
  "src/pages/Products.tsx",
  "src/pages/ProductView.tsx",
  "src/pages/Landing2.tsx",
  "src/components/Layout.tsx",
  "src/components/MobileMenu.tsx",
];

const replacements = [
  ['"Maj", sans-serif', "var(--font-sans)"],
  ['"Maj", serif', "var(--font-serif)"],
  ["'Maj', sans-serif", "var(--font-sans)"],
  ["'Maj', serif", "var(--font-serif)"],
];

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  for (const [from, to] of replacements) s = s.split(from).join(to);
  fs.writeFileSync(f, s);
  console.log("updated", f);
}
```

Run: `node scripts/tmp-font-refactor.mjs`
Expected: prints `updated <file>` for all nine files.

- [ ] **Step 2: Verify no hardcoded Maj remains in the nine files**

Run: `grep -rn "Maj" src/pages/Cart.tsx src/pages/Categories.tsx src/pages/CategoryView.tsx src/pages/ContactUs.tsx src/pages/Products.tsx src/pages/ProductView.tsx src/pages/Landing2.tsx src/components/Layout.tsx src/components/MobileMenu.tsx`
Expected: no output (exit 1). If any line prints, inspect it — it means a `"Maj"` usage in a form the four replacements didn't cover; convert it by hand to the matching `var(--font-serif)` / `var(--font-sans)`.

- [ ] **Step 3: Delete the temporary script**

Run: `rm scripts/tmp-font-refactor.mjs`
Expected: removed (it must not be committed).

- [ ] **Step 4: Verify the frontend typechecks and builds**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Cart.tsx src/pages/Categories.tsx src/pages/CategoryView.tsx src/pages/ContactUs.tsx src/pages/Products.tsx src/pages/ProductView.tsx src/pages/Landing2.tsx src/components/Layout.tsx src/components/MobileMenu.tsx
git commit -m "refactor(fonts): route storefront typography through global font variables"
```

---

### Task 8: End-to-end manual verification (EN + AR, storefront + admin)

**Files:** none (verification only)

- [ ] **Step 1: Confirm dev CORS allows the web origin for font loading**

The uploaded font is served from the API origin (`:5000`) while the web app runs on `:3007`; `@font-face` always loads in CORS mode. Confirm `FRONTEND_URL` in `server/.env` includes `http://localhost:3007` (it must already, since API calls work in dev). If missing, add it and restart the server.

- [ ] **Step 2: Start the app**

Run: `npm run dev`
Expected: both `server` (`:5000`) and `web` (`:3007`) start. Open `http://localhost:3007`.

- [ ] **Step 3: Baseline — default (Maj) look is unchanged**

Visit a storefront page (`/shop`, a category, a product, cart) and confirm typography still looks like Maj. Toggle language EN ↔ AR and confirm Arabic renders correctly (RTL).

- [ ] **Step 4: Upload a custom font from admin**

Log in at `/admin/login`, go to Settings → Global Font → Custom Font → **Upload font**, and pick `public/fonts/majalla.ttf` (a font visibly different from Maj, so the change is obvious). Confirm a success toast and that the admin UI immediately re-renders in the new face.

- [ ] **Step 5: Confirm the custom font reaches the whole app**

Without a hard refresh, navigate to the storefront and confirm the custom font now applies to headings and body across pages, in **both EN and AR**. Then hard-refresh (custom font loads via `App.tsx` on cold load) and confirm it persists.

- [ ] **Step 6: Confirm switching is non-destructive**

In Settings, select **Maj (Default)**, confirm the app returns to Maj, then select **Custom** again and confirm the uploaded font is still there and re-applies (the merge-preserve behavior).

- [ ] **Step 7: Capture screenshots**

Use Playwright (or manual screenshots) of a storefront page and an admin page under the custom font, in EN and AR, as the verification artifact.

- [ ] **Step 8: Final typecheck**

Run: `npm run lint` and `npm test --prefix server -- fontSettings`
Expected: both PASS. No commit needed (verification only).

---

## Self-Review Notes

- **Spec coverage:** §"Fonts as single global variable" → Tasks 1 + 7; §"Custom font storage (server)" → Tasks 2 + 3; §"Runtime application (client)" → Tasks 4 + 5; §"Settings UI" → Task 6; §"Default = Maj" → Task 1; §"Testing strategy" → Tasks 2 (server units) + 8 (manual EN/AR + Playwright). No gaps.
- **Client unit test for `applyCustomFont`:** the spec floated one, but the repo has no configured frontend test runner (jsdom), so setting one up would be out-of-scope scaffolding. Coverage moves to Task 8's manual/E2E verification, which exercises the real injection path. This is a deliberate, noted deviation.
- **Type consistency:** `FontSettings { selectedFont, custom? }` (catalog.ts) is used identically by `uploadFont` (admin.ts), `App.tsx`, and `Settings.tsx`; server `FontSettingValue { selectedFont, custom }` mirrors it. `applyCustomFont(url: string)` and `CUSTOM_FONT_FAMILY = "AppCustomFont"` match the `[data-font="custom"]` block and the Settings preview `fontFamily: "AppCustomFont"`. Card id `default` matches the server's first-load default and the `@theme` (no-override) resolution to Maj.
