# Default Site Language + Landing Page Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Arabic the site's default language (admin-adjustable from Settings), and add a working language toggle to the main landing page (`Landing2.tsx`, served at `/`), which today is 100% hardcoded English and never touches i18n.

**Architecture:** A new `Setting` row (`id: "language"`) mirrors the existing Theme/Font pattern exactly (`GET /api/settings/language` public, `PUT /api/admin/settings/language` admin-guarded). On boot, `App.tsx` applies that default via `i18n.changeLanguage()` only when the visitor has no cached language preference yet (mirrors how `initCurrencyPreference()` in `currencyStore.ts` already defers to a stored preference before applying a computed default). `Landing2.tsx` gets wired to `react-i18next` for the first time, reusing translation keys that already exist unused in `i18n.ts`, plus ~13 new key pairs for copy that has no match yet. A new gold-outline pill button (matching the toggle already in `Layout.tsx`/`MobileMenu.tsx`) is added to `Landing2`'s navbar next to "Shop Now".

**Tech Stack:** React 18 + TypeScript, react-i18next / i18next-browser-languagedetector, Express + Prisma (MySQL) on the server, Zustand (existing stores, not touched by this feature), Vite dev server on port 3007.

**Spec:** `docs/superpowers/specs/2026-07-08-default-language-and-landing-toggle-design.md`

---

### Task 1: Backend — `GET /api/settings/language`

**Files:**
- Modify: `server/src/routes/catalog.routes.ts:122` (insert after the existing `/settings/font` handler, before the blank line at 124)

- [ ] **Step 1: Add the route**

Insert immediately after the closing `});` of the `/settings/font` handler (the block ending at line 122):

```ts
/**
 * GET /api/settings/language
 * Site-wide default language for first-time visitors (no cached preference).
 * Individual visitors can still override via the client-side toggle.
 */
router.get("/settings/language", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "language" } });
    const value = (setting?.value as { defaultLanguage?: string } | null) ?? null;
    return res.json({ defaultLanguage: value?.defaultLanguage ?? "ar" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch language." });
  }
});
```

- [ ] **Step 2: Verify it compiles and responds**

Run: `npm run dev --prefix server` (or rely on the already-running `npm run dev` from repo root — the server listens on port `5000` per `server/src/index.ts:18`), then:
```bash
curl -s http://localhost:5000/api/settings/language; echo
```
Expected: `{"defaultLanguage":"ar"}` (no row exists yet, so it falls back to `"ar"`).

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/catalog.routes.ts
git commit -m "feat(server): add GET /api/settings/language"
```

---

### Task 2: Backend — `PUT /api/admin/settings/language`

**Files:**
- Modify: `server/src/routes/admin.routes.ts:378` (insert after the existing `/settings/font` handler, before the stray `/settings/currency` route at line 381)

- [ ] **Step 1: Add the route**

Insert after the `/settings/font` handler's closing `});` (line 378):

```ts
router.put("/settings/language", async (req: Request, res: Response) => {
  try {
    const defaultLanguage = String(req.body?.defaultLanguage ?? "");
    if (defaultLanguage !== "ar" && defaultLanguage !== "en") {
      return res.status(400).json({ error: "defaultLanguage must be 'ar' or 'en'." });
    }
    await prisma.setting.upsert({
      where: { id: "language" },
      update: { value: { defaultLanguage } },
      create: { id: "language", value: { defaultLanguage } },
    });
    return res.json({ defaultLanguage });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update language." });
  }
});
```

This route is automatically behind admin auth — `admin.routes.ts:29` already applies `router.use(requireAdmin)` to the whole file.

- [ ] **Step 2: Verify with a real admin token**

Log in as admin first to get a token (or reuse the browser's existing session/localStorage token), then:
```bash
curl -s -X PUT http://localhost:5000/api/admin/settings/language \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"defaultLanguage":"en"}'; echo
```
Expected: `{"defaultLanguage":"en"}`. Then re-run the Task 1 curl against `/api/settings/language` — it should now return `{"defaultLanguage":"en"}`. Set it back to `"ar"` afterward so local state matches the intended default.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/admin.routes.ts
git commit -m "feat(server): add PUT /api/admin/settings/language"
```

---

### Task 3: Frontend API client functions

**Files:**
- Modify: `src/lib/api/catalog.ts:40-79`
- Modify: `src/lib/api/admin.ts:109-113`

- [ ] **Step 1: Add the type + getter to `catalog.ts`**

Add next to `FontSettings` (after line 42):
```ts
export interface LanguageSettings {
  defaultLanguage: string;
}
```

Add next to `getFont` (after line 79):
```ts
export function getLanguageSettings(): Promise<LanguageSettings> {
  return apiFetch<LanguageSettings>("/api/settings/language");
}
```

- [ ] **Step 2: Add the admin update function to `admin.ts`**

Add after `updateFont` (after line 113):
```ts
export const updateLanguage = (defaultLanguage: string) =>
  adminFetch<{ defaultLanguage: string }>("/api/admin/settings/language", {
    method: "PUT",
    body: JSON.stringify({ defaultLanguage }),
  });
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint` (repo root — this is `tsc --noEmit`).
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/catalog.ts src/lib/api/admin.ts
git commit -m "feat(web): add language settings API client functions"
```

---

### Task 4: Stop trusting browser locale ahead of a saved preference, add a dedicated "user chose" flag

**Files:**
- Modify: `src/i18n.ts:872-881`

**Why a dedicated flag, not i18next's own cache:** `i18next-browser-languagedetector`'s default order (`querystring, cookie, localStorage, sessionStorage, navigator, htmlTag, ...`) lets a first-time visitor's browser locale win over `fallbackLng`. But the deeper problem — found during plan review, confirmed by reading `node_modules/i18next/dist/cjs/i18next.js:1996-2006` — is that `i18next.changeLanguage()` **unconditionally** calls `languageDetector.cacheUserLanguage(l)` once it resolves *any* language, including one resolved purely from `fallbackLng` with no detector match. Since `i18n.init()` calls `changeLanguage()` internally on startup, `localStorage.i18nextLng` gets written to `"ar"` synchronously during the `import "./i18n"` in `main.tsx` — **before** `App.tsx` ever mounts. A guard that checks `localStorage.getItem("i18nextLng")` will therefore always see it already set and never apply the admin default to anyone. This is the exact same trap `currencyStore.ts` avoids by gating `initCurrencyPreference()` on its own dedicated `jamhawi-currency-storage` key rather than on a detected currency value — this task does the same thing for language.

- [ ] **Step 1: Add explicit `detection` config, plus a dedicated "chosen" key + helper**

Replace:
```ts
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ar",
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
```
with:
```ts
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ar",
    detection: {
      // Browser/OS locale is deliberately excluded: the site defaults to
      // Arabic (or whatever the admin configures) for first-time visitors,
      // not whatever language their OS happens to be set to. Only an
      // explicit ?lng= param or a previously cached i18next language
      // overrides that default.
      order: ["querystring", "localStorage", "cookie"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// i18next caches its resolved language to localStorage on every init/change,
// even when that language came purely from fallbackLng with no real visitor
// choice behind it — so that cache can't be used to detect "has this visitor
// ever chosen a language." LANG_CHOSEN_KEY is a separate flag, set only by
// setUserLanguage() below (called from the toggle buttons), mirroring how
// currencyStore.ts gates its own default on a dedicated storage key instead
// of a detected value.
export const LANG_CHOSEN_KEY = "jamhawi-lang-chosen";

export function setUserLanguage(lang: string): void {
  localStorage.setItem(LANG_CHOSEN_KEY, "1");
  i18n.changeLanguage(lang);
}

export default i18n;
```

- [ ] **Step 2: Manually verify the fallback**

```bash
npm run dev
```
Open the dev server URL in a private/incognito window (guarantees no `localStorage`), with the browser set to any locale. The site should render in Arabic. Open devtools → Application → Local Storage: confirm `i18nextLng` is set to `"ar"` but `jamhawi-lang-chosen` is **absent** (this is the state Task 5 depends on).

- [ ] **Step 3: Commit**

```bash
git add src/i18n.ts
git commit -m "fix(web): stop browser locale overriding the default, add dedicated user-choice flag"
```

---

### Task 5: Route the existing language toggles through `setUserLanguage`

**Files:**
- Modify: `src/components/Layout.tsx:75-77`
- Modify: `src/components/MobileMenu.tsx:167-171`

Both existing toggles currently call `i18n.changeLanguage(...)` directly. They need to go through `setUserLanguage()` instead so `jamhawi-lang-chosen` gets set — otherwise Task 6's "has this visitor chosen a language" check can never become true, and the admin default would silently keep re-applying itself on every visit even after someone toggles.

- [ ] **Step 1: `Layout.tsx`**

Change:
```tsx
import { useTranslation } from "react-i18next";
```
to:
```tsx
import { useTranslation } from "react-i18next";
import { setUserLanguage } from "../i18n";
```

Change (lines 75-77):
```tsx
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
  };
```
to:
```tsx
  const toggleLanguage = () => {
    setUserLanguage(i18n.language === "ar" ? "en" : "ar");
  };
```

- [ ] **Step 2: `MobileMenu.tsx`**

Add the same import (`import { setUserLanguage } from "../i18n";`) near its existing imports.

Change (lines 167-171):
```tsx
          <button
            onClick={() => {
              i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
              onClose();
            }}
```
to:
```tsx
          <button
            onClick={() => {
              setUserLanguage(i18n.language === 'ar' ? 'en' : 'ar');
              onClose();
            }}
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`. Expected: no new errors.

- [ ] **Step 4: Manually verify**

`npm run dev`, click the language toggle in the shop header or mobile menu, then check devtools → Local Storage: `jamhawi-lang-chosen` should now be `"1"`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx src/components/MobileMenu.tsx
git commit -m "refactor(web): route language toggles through setUserLanguage"
```

---

### Task 6: Apply the admin default for visitors who haven't chosen a language

**Files:**
- Modify: `src/App.tsx:1-59`

- [ ] **Step 1: Import `i18n`, `LANG_CHOSEN_KEY`, and `getLanguageSettings`**

Change line 9 from:
```ts
import { getTheme, getFont } from "./lib/api/catalog";
```
to:
```ts
import { getTheme, getFont, getLanguageSettings } from "./lib/api/catalog";
import i18n, { LANG_CHOSEN_KEY } from "./i18n";
```

- [ ] **Step 2: Extend the bootstrap effect**

Change the effect at lines 44-59 from:
```tsx
  useEffect(() => {
    getTheme()
      .then((theme) => {
        document.documentElement.dataset.theme = theme.selectedTheme ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.theme = "default";
      });
    getFont()
      .then((font) => {
        document.documentElement.dataset.font = font.selectedFont ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.font = "default";
      });
  }, []);
```
to:
```tsx
  useEffect(() => {
    getTheme()
      .then((theme) => {
        document.documentElement.dataset.theme = theme.selectedTheme ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.theme = "default";
      });
    getFont()
      .then((font) => {
        document.documentElement.dataset.font = font.selectedFont ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.font = "default";
      });
    // Apply the admin-configured default only if this visitor has never used
    // the language toggle themselves. Uses the dedicated LANG_CHOSEN_KEY flag
    // (set only inside setUserLanguage), not i18next's own language cache —
    // that cache gets written on every init regardless of visitor intent, so
    // it can't tell "chosen" apart from "defaulted." See Task 4's note.
    if (!localStorage.getItem(LANG_CHOSEN_KEY)) {
      getLanguageSettings()
        .then((language) => {
          if (!localStorage.getItem(LANG_CHOSEN_KEY)) {
            i18n.changeLanguage(language.defaultLanguage);
          }
        })
        .catch(() => {
          // Fail open: i18n already resolved to fallbackLng ("ar").
        });
    }
  }, []);
```

The inner re-check of `LANG_CHOSEN_KEY` guards against a visitor toggling language while the fetch was in flight.

- [ ] **Step 3: Manually verify**

In a private window: clear site data, load the app, confirm Arabic (and `jamhawi-lang-chosen` still absent in Local Storage). In the admin Settings page (once Task 7 lands) switch the default to English, then in a *fresh* private window confirm the app now boots in English. In a window where you've already used the language toggle (from Task 5's check), confirm reloading keeps your toggled choice regardless of the admin default.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(web): apply admin default language for visitors who haven't chosen one"
```

---

### Task 7: Admin Settings UI — "Default Language" card

**Files:**
- Modify: `src/pages/admin/Settings.tsx`

- [ ] **Step 1: Imports**

Change line 2-6 from:
```ts
import { getTheme, getFont } from "../../lib/api/catalog";
import { updateTheme, updateFont, getAnalytics, listOffers, importData } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { toast } from "sonner";
import { Palette, CheckCircle2, Download, Upload, Type } from "lucide-react";
```
to:
```ts
import { getTheme, getFont, getLanguageSettings } from "../../lib/api/catalog";
import { updateTheme, updateFont, updateLanguage, getAnalytics, listOffers, importData } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { toast } from "sonner";
import { Palette, CheckCircle2, Download, Upload, Type, Languages } from "lucide-react";
```

- [ ] **Step 2: State + load**

Change lines 22-44 from:
```tsx
  const [selected, setSelected] = useState("default");
  const [selectedFont, setSelectedFont] = useState("default");
  const [saving, setSaving] = useState(false);
  const [savingFont, setSavingFont] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTheme(), getFont()])
      .then(([theme, font]) => {
        if (theme.selectedTheme) {
          setSelected(theme.selectedTheme);
        }
        if (font.selectedFont) {
          setSelectedFont(font.selectedFont);
        }
      })
      .catch((e) => handleApiError(e, OperationType.GET, "settings"))
      .finally(() => setLoading(false));
  }, []);
```
to:
```tsx
  const [selected, setSelected] = useState("default");
  const [selectedFont, setSelectedFont] = useState("default");
  const [selectedLanguage, setSelectedLanguage] = useState("ar");
  const [saving, setSaving] = useState(false);
  const [savingFont, setSavingFont] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTheme(), getFont(), getLanguageSettings()])
      .then(([theme, font, language]) => {
        if (theme.selectedTheme) {
          setSelected(theme.selectedTheme);
        }
        if (font.selectedFont) {
          setSelectedFont(font.selectedFont);
        }
        if (language.defaultLanguage) {
          setSelectedLanguage(language.defaultLanguage);
        }
      })
      .catch((e) => handleApiError(e, OperationType.GET, "settings"))
      .finally(() => setLoading(false));
  }, []);
```

- [ ] **Step 3: Save handler**

Add after `handleSaveFont` (after line 71):
```tsx
  const handleSaveLanguage = async (languageId: string) => {
    setSelectedLanguage(languageId);
    setSavingLanguage(true);
    try {
      await updateLanguage(languageId);
      toast.success("Default language updated");
    } catch (e) {
      handleApiError(e, OperationType.WRITE, "settings/language");
    } finally {
      setSavingLanguage(false);
    }
  };
```

Note: this intentionally does **not** call `i18n.changeLanguage()` for the admin's own browser — this setting is "the default new visitors see," not a forced global override (that's what Theme/Font already do). The admin's own session keeps whatever language they're already using.

- [ ] **Step 4: Render the card**

Insert a new card after the "Global Font" card's closing `</div>` (after line 340), before the component's final closing `</div>` (line 341):
```tsx
      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
        <h2 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-3 font-serif">
          <Languages className="w-6 h-6 text-stone-600" />
          Default Language
        </h2>
        <p className="text-stone-500 mb-8">
          Sets the language first-time visitors see. Visitors who already
          picked a language using the site's toggle keep their own choice.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "ar", name: "Arabic", sample: "جمهاوي" },
            { id: "en", name: "English", sample: "Jamhawi" },
          ].map((option) => {
            const isActive = selectedLanguage === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSaveLanguage(option.id)}
                disabled={savingLanguage}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[var(--color-accent)] bg-stone-50"
                    : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                {isActive && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div className="font-medium text-lg text-stone-800 mb-4 font-serif">
                  {option.name}
                </div>
                <div className="text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 font-serif">
                  {option.sample}
                </div>
              </button>
            );
          })}
        </div>
      </div>
```

- [ ] **Step 5: Typecheck + manual verify**

Run: `npm run lint`.
Then `npm run dev`, log into `/admin/settings`, confirm the new "Default Language" card loads with the correct active option, and clicking the other option shows the "Default language updated" toast and flips the active ring without touching the admin's own current UI language.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Settings.tsx
git commit -m "feat(admin): add Default Language settings card"
```

---

### Task 8: Add the missing i18n key pairs

**Files:**
- Modify: `src/i18n.ts:436` (end of the `ar` block, before the closing `},`)
- Modify: `src/i18n.ts:868` (end of the `en` block, before the closing `},`)

`Landing2.tsx` needs 13 strings that have no existing key. Add them to both language blocks, keeping the same key names in each.

- [ ] **Step 1: Add to the `ar` resources block**

Insert immediately before the closing `},` at line 436 (right after `save_product_first`):
```ts
      hero_subtitle: "تمور فاخرة وحلويات يدوية، مُنتقاة بعناية من الواحات القديمة ومُهيأة لأصحاب الذوق الرفيع.",
      texture_and_taste: "قوام ومذاق",
      signature_body: "يُحصد بلحنا في ذروة النضج تحت أشعة الشمس الذهبية الدافئة. يلتقط كل حصاد التبلور الدقيق للسكريات الطبيعية مكوّناً قشرة رقيقة أشبه بالكراميل — رحلة حسية تبدأ بالكمال البصري وتنتهي بفخامة استثنائية.",
      natural_100: "100% طبيعي",
      explore: "استكشف",
      cat_sub_dates: "تمور مختارة فاخرة",
      cat_sub_gift_boxes: "مجموعات منسقة",
      cat_sub_sweets: "حلويات حرفية",
      cat_sub_premium: "تشكيلة حصرية",
      cat_sub_fallback: "تشكيلة فاخرة",
      story_body: "منذ أكثر من أربعة عقود، تنتقي جمهاوي أرقى الكنوز الزراعية. من بساتين النخيل المشمسة التي تُنتج تمورنا المُميزة إلى المزارع العضوية التي تُنتج المربيات الغنية، يعكس كل منتج التزامنا بالجودة النقية والحرفية التقليدية.",
      your_email_address: "بريدك الإلكتروني",
      footer_copyright: "© {{year}} جمهاوي. جميع الحقوق محفوظة.",
```

- [ ] **Step 2: Add to the `en` resources block**

Insert immediately before the closing `},` at line 868 (right after `save_product_first`):
```ts
      hero_subtitle: "Premium dates and artisanal confections, hand-selected from ancient oases and curated for the discerning few.",
      texture_and_taste: "Texture & Taste",
      signature_body: "Our dates are harvested at the peak of maturity under the warm golden sun. Every harvest captures the intricate crystallization of natural sugars forming a delicate, caramel-like skin — a sensory journey that begins with visual perfection and ends with exquisite luxury.",
      natural_100: "100% Natural",
      explore: "Explore",
      cat_sub_dates: "Premium Selected Dates",
      cat_sub_gift_boxes: "Curated Collections",
      cat_sub_sweets: "Artisanal Treats",
      cat_sub_premium: "Exclusive Selection",
      cat_sub_fallback: "Premium Selection",
      story_body: "For over four decades, Jamhawi has curated the finest agricultural treasures. From the sun-drenched palm groves yielding our signature dates to the organic farms producing rich preserves, every product represents our dedication to pristine quality and traditional craftsmanship.",
      your_email_address: "Your Email Address",
      footer_copyright: "© {{year}} Jamhawi. All rights reserved.",
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`. Expected: no errors (these are plain object literal additions, `resources` isn't strictly typed against a key union anywhere in the codebase).

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "feat(web): add i18n keys for Landing2 copy"
```

---

### Task 9: Wire `Landing2.tsx` to i18n

**Files:**
- Modify: `src/pages/Landing2.tsx`

- [ ] **Step 1: Import `useTranslation` and `setUserLanguage`**

Change line 1 from:
```tsx
import { useEffect, useRef, useState } from "react";
```
to:
```tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { setUserLanguage } from "../i18n";
```

- [ ] **Step 2: Get `t`/`i18n` in the component**

Change line 40-41 from:
```tsx
export default function Landing2() {
  const videoRef        = useRef<HTMLVideoElement>(null);
```
to:
```tsx
export default function Landing2() {
  const { t, i18n } = useTranslation();
  const videoRef        = useRef<HTMLVideoElement>(null);
```

- [ ] **Step 3: Navbar brand + Shop Now (lines 717-723)**

Change:
```tsx
        <header className="an-nav" ref={headerRef}>
          <a className="an-nav-brand" href="/landing2">
            <img src="logo-circle.png" className="w-10 h-10 rounded-full object-cover" alt="Jamhawi Logo" />
            <span>JAMHAWI</span>
          </a>
          <Link to="/shop/products" className="an-nav-cta">Shop Now</Link>
        </header>
```
to:
```tsx
        <header className="an-nav" ref={headerRef}>
          <a className="an-nav-brand" href="/landing2">
            <img src="logo-circle.png" className="w-10 h-10 rounded-full object-cover" alt="Jamhawi Logo" />
            <span>{t("jamhawi")}</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setUserLanguage(i18n.language === "ar" ? "en" : "ar")}
              className="an-lang-toggle"
              aria-label="Toggle language"
            >
              {i18n.language === "ar" ? "EN" : "عربي"}
            </button>
            <Link to="/shop/products" className="an-nav-cta">{t("shop_now")}</Link>
          </div>
        </header>
```

(The `.an-lang-toggle` CSS class is added in Task 10. Using `setUserLanguage` — not a raw `i18n.changeLanguage` call — is required here too, so this toggle also sets `jamhawi-lang-chosen`, consistent with Task 5's change to the other two toggles.)

- [ ] **Step 4: Hero section (lines 737-758)**

Change:
```tsx
            <div className="an-hero-content" ref={heroContentRef}>
              <span className="an-label-caps">The Art of Details</span>
              <h1 className="an-hero-title">
                Immersive<br /><em>Purity</em>
              </h1>
              <p className="an-hero-sub">
                Premium dates and artisanal confections, hand-selected from ancient oases and curated for the discerning few.
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                <Link to="/shop/products" className="an-btn-primary">
                  Shop Now
                  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <a href="#collection" className="an-btn-ghost">Discover More</a>
              </div>
              <div className="an-scroll-hint" aria-hidden="true">
                <span>Scroll</span>
                <div className="an-scroll-line" />
              </div>
            </div>
```
to:
```tsx
            <div className="an-hero-content" ref={heroContentRef}>
              <span className="an-label-caps">{t("the_art_of_details")}</span>
              <h1 className="an-hero-title">
                {t("immersive")}<br /><em>{t("purity")}</em>
              </h1>
              <p className="an-hero-sub">
                {t("hero_subtitle")}
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
                <Link to="/shop/products" className="an-btn-primary">
                  {t("shop_now")}
                  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <a href="#collection" className="an-btn-ghost">{t("discover_more")}</a>
              </div>
              <div className="an-scroll-hint" aria-hidden="true">
                <span>{t("scroll")}</span>
                <div className="an-scroll-line" />
              </div>
            </div>
```

- [ ] **Step 5: Signature section (lines 762-815)**

Change:
```tsx
                <div className="an-content-block">
                  <span className="an-section-kicker">Signature Harvest</span>
                  <h2 className="an-headline-lg">A Symphony of<br />Texture &amp; Taste</h2>
                  <p className="an-body-lg">
                    Our dates are harvested at the peak of maturity under the warm golden sun.
                    Every harvest captures the intricate crystallization of natural sugars forming
                    a delicate, caramel-like skin — a sensory journey that begins with visual
                    perfection and ends with exquisite luxury.
                  </p>
                  <div className="an-chips">
                    <span className="an-chip">100% Natural</span>
                    <span className="an-chip">Hand-Selected</span>
                    <span className="an-chip">Est. 1984</span>
                  </div>
                  <div className="an-features">
                    <div className="an-feature-item">
                      <span className="an-feature-num">01</span>
                      <div>
                        <h3 className="an-feature-title">Pure Origin</h3>
                        <p className="an-feature-desc">Cultivated in the world-renowned mineral-rich soil of ancient Saudi oases.</p>
                      </div>
                    </div>
                    <div className="an-feature-item">
                      <span className="an-feature-num">02</span>
                      <div>
                        <h3 className="an-feature-title">Hand-Selected</h3>
                        <p className="an-feature-desc">Each date undergoes rigorous inspection to guarantee optimal texture, moisture, and sweetness.</p>
                      </div>
                    </div>
                  </div>
                </div>
```
to:
```tsx
                <div className="an-content-block">
                  <span className="an-section-kicker">{t("signature_harvest")}</span>
                  <h2 className="an-headline-lg">{t("a_symphony_of")}<br />{t("texture_and_taste")}</h2>
                  <p className="an-body-lg">
                    {t("signature_body")}
                  </p>
                  <div className="an-chips">
                    <span className="an-chip">{t("natural_100")}</span>
                    <span className="an-chip">{t("hand_selected")}</span>
                    <span className="an-chip">{t("est_1984_2")}</span>
                  </div>
                  <div className="an-features">
                    <div className="an-feature-item">
                      <span className="an-feature-num">01</span>
                      <div>
                        <h3 className="an-feature-title">{t("pure_origin")}</h3>
                        <p className="an-feature-desc">{t("cultivated_in_the_world_renowned_mineral")}</p>
                      </div>
                    </div>
                    <div className="an-feature-item">
                      <span className="an-feature-num">02</span>
                      <div>
                        <h3 className="an-feature-title">{t("hand_selected")}</h3>
                        <p className="an-feature-desc">{t("each_date_undergoes_rigorous_inspection_")}</p>
                      </div>
                    </div>
                  </div>
                </div>
```

And the luxury card just below it:
```tsx
                      <h4 className="an-card-title">JAMHAWI GOLD</h4>
                      <div className="an-card-rule" />
                      <p className="an-card-sub">Limited Edition Harvest</p>
                      <span className="an-card-year">EST. 1984</span>
```
to:
```tsx
                      <h4 className="an-card-title">{t("jamhawi_gold")}</h4>
                      <div className="an-card-rule" />
                      <p className="an-card-sub">{t("limited_edition_harvest_2")}</p>
                      <span className="an-card-year">{t("est_1984")}</span>
```

- [ ] **Step 6: Categories section (lines 823-866)**

Change the header:
```tsx
                <div className="an-categories-header">
                  <span className="an-section-kicker">Our Collection</span>
                  <h2 className="an-headline-lg">Shop by Category</h2>
                </div>
```
to:
```tsx
                <div className="an-categories-header">
                  <span className="an-section-kicker">{t("our_collection")}</span>
                  <h2 className="an-headline-lg">{t("shop_by_category")}</h2>
                </div>
```

Change the per-category card body:
```tsx
                    : categories.map((cat, i) => {
                        const nameKey = cat.name.toLowerCase();
                        const badge = badgeMapping[nameKey] || fallbackBadge;
                        const sub = subMapping[nameKey] || "Premium Selection";
                        const img = cat.image || imageMapping[nameKey] || "/assets/animations/frames/ezgif-frame-010.jpg";

                        return (
                          <article key={cat.id} className="an-cat-card" style={{ transitionDelay: `${i * 80}ms` }}>
                            <div className="an-cat-card__badge">
                              <svg viewBox="0 0 48 48" fill="none">{badge}</svg>
                            </div>
                            <div className="an-cat-card__img-wrap">
                              <img src={img} alt={cat.name} />
                            </div>
                            <div className="an-cat-card__body">
                              <h3 className="an-cat-card__name">{cat.name}</h3>
                              <div className="an-cat-card__rule" />
                              <p className="an-cat-card__sub">{sub}</p>
                              <Link to={`/category/${cat.id}`} className="an-cat-card__cta">
                                Explore
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </Link>
                            </div>
                          </article>
                        );
                      })}
```
to:
```tsx
                    : categories.map((cat, i) => {
                        const nameKey = cat.name.toLowerCase();
                        const badge = badgeMapping[nameKey] || fallbackBadge;
                        const subKeyMap: Record<string, string> = {
                          "dates": "cat_sub_dates",
                          "gift boxes": "cat_sub_gift_boxes",
                          "sweets": "cat_sub_sweets",
                          "premium": "cat_sub_premium",
                        };
                        const sub = t(subKeyMap[nameKey] || "cat_sub_fallback");
                        const img = cat.image || imageMapping[nameKey] || "/assets/animations/frames/ezgif-frame-010.jpg";
                        const displayName = i18n.language === "ar" ? cat.nameAr || cat.name : cat.name;

                        return (
                          <article key={cat.id} className="an-cat-card" style={{ transitionDelay: `${i * 80}ms` }}>
                            <div className="an-cat-card__badge">
                              <svg viewBox="0 0 48 48" fill="none">{badge}</svg>
                            </div>
                            <div className="an-cat-card__img-wrap">
                              <img src={img} alt={displayName} />
                            </div>
                            <div className="an-cat-card__body">
                              <h3 className="an-cat-card__name">{displayName}</h3>
                              <div className="an-cat-card__rule" />
                              <p className="an-cat-card__sub">{sub}</p>
                              <Link to={`/category/${cat.id}`} className="an-cat-card__cta">
                                {t("explore")}
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </Link>
                            </div>
                          </article>
                        );
                      })}
```

This matches the `i18n.language === "ar" ? cat.nameAr || cat.name : cat.name` convention already used in `Categories.tsx:369`.

- [ ] **Step 7: Story & footer (lines 873-915)**

Change:
```tsx
                <div className="an-story-content">
                  <span className="an-section-kicker">Our Heritage</span>
                  <h2 className="an-story-title">A Legacy of Pure Taste</h2>
                  <p className="an-story-text">
                    For over four decades, Jamhawi has curated the finest agricultural treasures.
                    From the sun-drenched palm groves yielding our signature dates to the organic
                    farms producing rich preserves, every product represents our dedication to
                    pristine quality and traditional craftsmanship.
                  </p>
                  <Link to="/shop/products" className="an-btn-primary">
                    Browse the Store
                    <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>

                <div className="an-newsletter-card">
                  <h3 className="an-newsletter-title">Subscribe to the Club</h3>
                  <p className="an-newsletter-text">
                    Receive exclusive access to seasonal harvests and limited edition collections.
                  </p>
                  <form className="an-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                    <input type="email" placeholder="Your Email Address" aria-label="Email Address" required />
                    <button type="submit">Join</button>
                  </form>
                </div>
              </div>

              <footer className="an-site-footer">
                <div className="an-footer-brand">JAMHAWI</div>
                <nav className="an-footer-links" aria-label="Footer navigation">
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms of Service</a>
                  <Link to="/shop">Shop</Link>
                </nav>
                <div className="an-footer-copy">&copy; {new Date().getFullYear()} Jamhawi. All rights reserved.</div>
              </footer>
```
to:
```tsx
                <div className="an-story-content">
                  <span className="an-section-kicker">{t("our_heritage")}</span>
                  <h2 className="an-story-title">{t("a_legacy_of_pure_taste")}</h2>
                  <p className="an-story-text">
                    {t("story_body")}
                  </p>
                  <Link to="/shop/products" className="an-btn-primary">
                    {t("browse_the_store")}
                    <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>

                <div className="an-newsletter-card">
                  <h3 className="an-newsletter-title">{t("subscribe_to_the_club")}</h3>
                  <p className="an-newsletter-text">
                    {t("receive_exclusive_access_to_seasonal_har")}
                  </p>
                  <form className="an-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                    <input type="email" placeholder={t("your_email_address")} aria-label={t("your_email_address")} required />
                    <button type="submit">{t("join")}</button>
                  </form>
                </div>
              </div>

              <footer className="an-site-footer">
                <div className="an-footer-brand">{t("jamhawi")}</div>
                <nav className="an-footer-links" aria-label="Footer navigation">
                  <a href="#">{t("privacy_policy")}</a>
                  <a href="#">{t("terms_of_service")}</a>
                  <Link to="/shop">{t("shop")}</Link>
                </nav>
                <div className="an-footer-copy">{t("footer_copyright", { year: new Date().getFullYear() })}</div>
              </footer>
```

- [ ] **Step 8: Typecheck**

Run: `npm run lint`. Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Landing2.tsx
git commit -m "feat(web): wire Landing2 to i18n"
```

---

### Task 10: Add the language toggle's CSS

**Files:**
- Modify: `src/pages/Landing2.tsx:217-233` (the `<style>` block, right after `.an-nav-cta:hover`)

- [ ] **Step 1: Add `.an-lang-toggle`**

Insert after the `.an-nav-cta:hover` rule (after line 233):
```css
        .an-lang-toggle {
          padding: 0.4rem 1rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent;
          color: var(--an-text-muted);
          font-family: "Maj", sans-serif;
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer;
          transition: all 200ms ease;
        }
        .an-lang-toggle:hover {
          border-color: var(--an-gold);
          color: var(--an-gold);
        }
```

- [ ] **Step 2: Manual visual check**

```bash
npm run dev
```
Open `http://localhost:3007/` (or whatever port `dev:web` binds). Confirm:
- The toggle pill renders between the logo and "Shop Now", doesn't overlap or wrap awkwardly at mobile widths (`clamp(1.5rem, 5vw, 5rem)` nav padding — check ~375px viewport too).
- Clicking it flips the entire page (hero, signature section, categories, story, footer) to Arabic/English and back.
- Navigating to `/shop/products` after toggling shows the same language (confirms the single shared `i18n` instance).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing2.tsx
git commit -m "style(web): add language toggle pill to Landing2 navbar"
```

---

## Self-Review Notes

- **Spec coverage:** Admin default-language setting (Tasks 1,2,3,4,5,6,7), Landing2 toggle + full translation (Tasks 8,9,10). Both spec requirements covered.
- **New-visitor-only default, fixed after advisor review:** the original draft gated on i18next's own `i18nextLng` cache key, which `i18next.changeLanguage()` writes unconditionally on init (confirmed by reading `node_modules/i18next/dist/cjs/i18next.js:1996-2006`) — so the guard would never actually fire. Fixed by introducing a dedicated `LANG_CHOSEN_KEY` (`jamhawi-lang-chosen`), set only inside `setUserLanguage()` (Task 4), which the three toggle sites now call instead of `i18n.changeLanguage` directly (Tasks 5 and 9). Task 6 checks `LANG_CHOSEN_KEY`, not `i18nextLng`. This mirrors the existing `currencyStore.ts`/`currencySettingsStore.ts` pattern (`jamhawi-currency-storage` key + `initCurrencyPreference`), which has the same "admin default vs. visitor's own choice" shape.
- **Task 7 explicitly does not call `i18n.changeLanguage`/`setUserLanguage` on save** — it's the admin's own browser, not a visitor, and this setting is a default for new visitors, not a forced global override (unlike Theme/Font).
- **No RTL work included anywhere** — matches the spec's explicit scope boundary.
- **Type/name consistency checked:** `getLanguageSettings`/`LanguageSettings` (Task 3) match usage in Task 6 and Task 7; `updateLanguage` (Task 3) matches usage in Task 7; `setUserLanguage`/`LANG_CHOSEN_KEY` (Task 4) match usage in Tasks 5, 6, and 9; all `t()` keys used in Task 9 exist either already in `i18n.ts` or are added in Task 8 — cross-checked each one against both lists.
- **Found during browser verification (post-implementation, not caught by typecheck or the plan review): ~27 of the "already existing" keys reused in Task 9 turned out to hold identical English placeholder text in *both* the `ar` and `en` blocks** — i.e. never actually translated, despite living in the `ar` resources object. This was invisible to `tsc` (plain string literals) and to the advisor's review (which correctly caught the `localStorage` timing bug but had no way to see into the untranslated content). Caught by loading `/` in a real browser and reading the rendered Arabic page — most of the copy was still English. Fixed by translating those ~27 `ar`-block values in place (`jamhawi`, `shop_now`, `the_art_of_details`, `immersive`, `purity`, `signature_harvest`, `pure_origin`, `cultivated_in_the_world_renowned_mineral`, `hand_selected`, `each_date_undergoes_rigorous_inspection_`, `jamhawi_gold`, `est_1984`, `est_1984_2`, `shop_by_category`, `our_heritage`, `a_legacy_of_pure_taste`, `browse_the_store`, `subscribe_to_the_club`, `receive_exclusive_access_to_seasonal_har`, `join`, `privacy_policy`, `terms_of_service`, `shop`, `discover_more`, `scroll`, `a_symphony_of`, `limited_edition_harvest_2`, `our_collection`), verified line-by-line before writing. **Left untouched, deliberately out of scope:** `limited_edition_harvest` (no `_2` suffix) — same bug, but not referenced by `Landing2.tsx`, and other pages (e.g. `ProductView.tsx`'s `jamhawi_premium_collection`) likely have the same untranslated-placeholder issue in the same cluster of keys — not fixed here since they're outside this feature's file scope. **Lesson for future work touching this file:** don't trust that a key existing in the `ar` block means it's actually Arabic — verify rendered output in a browser, not just that the key resolves.
