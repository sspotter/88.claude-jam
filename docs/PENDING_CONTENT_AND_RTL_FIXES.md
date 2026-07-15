# Pending content & RTL fixes (snapshot: 2026-07-15)

Source: `docs/ملاحظات.pdf` (client notes/screenshots) + a code audit done alongside it.
**Nothing in this file has been implemented yet** — it's a record of what was asked for and
what's broken, so the next session can act on it without re-discovering all of this.

---

## 1. Landing page copy changes (from the PDF screenshots)

The PDF shows the current Landing2 "Signature" section (سيمفونية من قوام ومذاق) with a red X
drawn through the heading and an arrow labeled **"حذف كل هذا"** ("delete all of this") pointing
at the chips row + the numbered `01 / 02` features list (Pure Origin / Hand-Selected).

New copy given to replace it:

> **من قلب الأرض المصرية، نصنع معياراً جديداً للتمور الطازجة الفاخرة.**
> في جمحاوي، نلتزم بإنتاج تمور طازجة عضوية استثنائية، تجمع بين أصالة الزراعة المصرية وخصوبة
> تربتها المروية بمياه النيل وأعلى معايير الجودة والاحترافية، لنقدم لعملائنا وشركائنا حول العالم
> تجربة موثوقة تبدأ من المزرعة وتصل إليهم بكامل طزاجتها.
> **جمحاوي... المذاق هو الفارق.**

→ Maps to `a_symphony_of` / `texture_and_taste` (heading) and `signature_body` (paragraph) in
[i18n.ts](../src/i18n.ts), rendered at
[Landing2.tsx:791-800](../src/pages/Landing2.tsx#L791-L800). The `حذف كل هذا` annotation implies
the `.an-chips` row (`natural_100` / `hand_selected` / `est_1984_2`) and the `.an-features`
01/02 list (`pure_origin`, `hand_selected` again) should be removed, not just the heading —
**confirm this with the client before deleting**, the PDF only marks it with an arrow, no
explicit text instruction.

Second screenshot: the "Our Heritage" section (إرث من النقاء والمذاق) with an arrow labeled
**"انضم الى عالمنا"** ("join our world") pointing at the newsletter card's current heading
"انضم إلى النادي" ("Join the Club") — reads as a rename suggestion for `subscribe_to_the_club`.

New copy given directly below that screenshot (best guess: replacement for `story_body` /
`a_legacy_of_pure_taste`, since it's generic brand narrative, not newsletter copy):

> في جمحاوي، لا نقدّم تمرًا عاديًا؛ بل ثمرة طازجة عضوية فاخرة، تصل إليك كما لو قُطفت للتو من
> النخلة.
> نختار كل تمرة بعناية، ونحفظ نضارتها وجودتها لتمنحك مذاقًا طبيعيًا استثنائيًا.
> **جرّب جمحاوي... ألن المذاق هو الفارق.**

→ Maps to [Landing2.tsx:902-917](../src/pages/Landing2.tsx#L902-L917) (`our_heritage` /
`a_legacy_of_pure_taste` / `story_body`).

**These are pure content edits** — no layout/code change needed, just swapping the Arabic
(and probably matching English) values in `i18n.ts` for the keys above, and removing the
chips/features block from the JSX if that's confirmed.

---

## 2. Product page — Arabic descriptions to add (from the PDF)

The PDF's `/shop/products` screenshot (in Arabic) shows the page chrome (search, filters,
buttons) already translated, but the **product cards themselves are English-only** — box
photography says "JAMHAWI" / "AMHAWI" and there's no Arabic body copy per product yet. Five
products are shown: مربى البلح (date jam), البلح الأصفر (yellow dates), حياني أحمر (red
Hayani), بلح رطب (soft/Ratb dates), بلح زغلول (Zaghloul dates).

Full Arabic descriptions given in the PDF, ready to paste into the admin product editor's
description field once it supports Arabic (see §4 below — **it currently doesn't**):

### بلح زغلول (Zaghloul) — price shown 1.64 $, tag "5 كيلو فقط"
> تمر الزغلول الطازج العضوي من مزارع جمحاوي هو أحد الأصناف المصرية المميزة، يُزرع بعناية وفق
> ممارسات زراعية طبيعية، ويُحصد في التوقيت المثالي ليحتفظ بلونه الأحمر الجذاب، وقوامه المتماسك،
> ومذاقه الطازج الغني.
> تنتقي جمحاوي الثمار بعناية، ثم تحافظ على جودتها ونضارتها عبر منظومة متكاملة من الفرز والتعبئة
> والتبريد، لتصل إلى العميل بأفضل حالة ممكنة. ويتميز الزغلول بقدرته المناسبة على الشحن للأسواق
> البعيدة، ما يجعله خيارًا مثاليًا للمستوردين والموزعين الباحثين عن منتج مصري طازج، فاخر، ومستقر
> الجودة.
> **زغلول جمحاوي... طزاجة مصرية أصيلة، وجودة تليق بالأسواق العالمية.**

### بلح رطب (Ratb) — price shown 2.05 $
> التمر الرطب العضوي من جمحاوي هو ثمرة طبيعية طازجة تُحصد في مرحلة النضج المثالية، لتحتفظ
> بقوامها الطري، ونكهتها الغنية، وحلاوتها المتوازنة. ويُزرع بعناية وفق ممارسات زراعية طبيعية
> تحافظ على نقاء الثمرة وجودتها.
> تنتقي جمحاوي أفضل الثمار، ثم تحافظ على طزاجتها من المزرعة وحتى وصولها إلى العميل عبر منظومة
> دقيقة من الفرز والتعبئة والتبريد، لتقدم تجربة فاخرة تعكس أصالة التمور المصرية وجودتها.
> **رطب جمحاوي العضوي... طزاجة طبيعية، مذاق أصيل، وجودة تُلمس من أول تمرة.**

### حياني أحمر (Red Hayani) — price shown 1.64 $
> التمر الحياني الأحمر الطازج من جمحاوي هو أحد أصناف التمور المصرية المميزة، ويشتهر بلونه
> الأحمر الجذاب، وقوامه المتماسك، ومذاقه الطبيعي المتوازن. يُحصد في مرحلة الطزاجة المثالية، ثم
> يُنتقى بعناية ليحافظ على شكله وجودته ونكهته الأصيلة.
> وتلتزم جمحاوي بالمحافظة على جودة الحياني منذ المزرعة وحتى وصوله إلى العميل، من خلال الفرز
> الدقيق، والتعبئة الاحترافية، وسلسلة التبريد المتكاملة.
> **حياني جمحاوي الأحمر... طزاجة مصرية أصيلة ومذاق يعبّر عن جودة الثمرة.**

### البلح الأصفر (Yellow/Asfar) — price shown 17.42 $ ⚠️
> التمر الأصفر العضوي من جمحاوي هو ثمرة مصرية طازجة تتميز بلونها الذهبي الجذاب، وقوامها
> المتماسك، ومذاقها الطبيعي المتوازن. يُزرع بعناية وفق ممارسات زراعية تحافظ على نقاء الثمرة، ثم
> يُحصد في التوقيت المثالي لضمان أعلى مستويات الطزاجة والجودة.
> وتنتقي جمحاوي أفضل الثمار، مع تطبيق فرز دقيق وتعبئة احترافية وسلسلة تبريد متكاملة، لتصل إلى
> العميل بحالتها الطبيعية ومظهرها المميز.
> **التمر الأصفر العضوي من جمحاوي... طزاجة ذهبية، مذاق أصيل، وجودة تستحق التجربة.**
>
> ⚠️ Note: 17.42 $ is ~10x the other products' price (1.64–2.05 $) — worth double-checking in
> the admin whether that's correct or a data-entry slip before publishing.

### مربى البلح (Date Jam)
No description text was included in the PDF for this one — only its name/thumbnail appeared
in the product grid screenshot. Needs copy from the client before it can be added.

---

## 3. ⚠️ RTL layout doesn't work on shop/product/category pages (the important one)

This is the same bug class we fixed on Landing2 ([Landing2.tsx:725](../src/pages/Landing2.tsx#L725),
`dir={i18n.language === "ar" ? "rtl" : "ltr"}`) — but it was **never propagated** to the
storefront's shared layout, so switching to Arabic on `/shop`, `/shop/products`,
`/shop/categories`, `/shop/category/:id`, `/shop/product/:id`, `/cart`, `/checkout` etc. still
renders everything left-to-right.

**Root cause:** [Layout.tsx:73-77](../src/components/Layout.tsx#L73-L77) —

```tsx
useEffect(() => {
  // Keep lang attribute in sync for accessibility/SEO but never flip layout direction
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = "ltr";
}, [i18n.language]);
```

`dir` is hardcoded to `"ltr"` **on purpose** (per that comment) regardless of language, on
every route `Layout` wraps. [AdminLayout.tsx:39-43](../src/components/AdminLayout.tsx#L39-L43)
does the identical thing for `/admin/*`. Since the site's `fallbackLng` is `"ar"`
([i18n.ts:1261](../src/i18n.ts#L1261)), Arabic is a completely normal, expected state for these
pages — not an edge case.

**Effect on product/category cards:** the grids themselves
(`Categories.tsx` `.cats-grid`, `Products.tsx` `.anp2-grid`, `CategoryView.tsx` `.anc-grid`) are
plain CSS Grid with no hardcoded left/right, so they'd mirror correctly the moment `dir="rtl"`
is allowed through — same mechanism as the Landing2 fix. But there are also a couple of
**hardcoded physical-side bugs that `dir` alone won't fix**:
- [Categories.tsx:228-230](../src/pages/Categories.tsx#L228-L230) — `.cats-card__badge` uses
  `position: absolute; right: 0.9rem;` (physical), needs to become `inset-inline-end` or a
  conditional `left`/`right` swap so the badge doesn't stay pinned to the same physical corner
  in both languages.
- [Products.tsx:191-196](../src/pages/Products.tsx#L191-L196) — the search icon is
  `left: 1rem` with matching asymmetric input padding
  ([Products.tsx:201-203](../src/pages/Products.tsx#L201-L203), `padding: 0.7rem 1rem 0.7rem 2.75rem`)
  — needs to mirror to the right side in RTL.

**Suggested fix, mirroring what we did on Landing2:**
1. In `Layout.tsx`, replace the hardcoded `document.documentElement.dir = "ltr"` with
   `document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr"` (or scope it to a
   wrapper element instead of `document.documentElement` if global RTL is judged too big a
   blast radius — needs a decision, since this affects every shop page at once, unlike the
   single-page Landing2 change).
2. Fix the two hardcoded-physical-side spots above (badge corner, search icon) so they don't
   end up stuck on the wrong side once mirroring is enabled.
3. Decide whether `AdminLayout.tsx` should get the same treatment — its comment
   ("Admin layout always stays LTR — only language changes, not direction") reads like a
   deliberate product decision for the admin panel specifically, so probably **leave admin
   alone** unless told otherwise.
4. Re-test the storefront nav/footer the same way we pinned Landing2's nav to `dir="ltr"`
   ([Landing2.tsx:728](../src/pages/Landing2.tsx#L728)) if the same "logo left, buttons right
   regardless of language" requirement applies to the shop header too.

---

## 4. Bilingual product data gaps (root cause of "shop still shows English only")

Two separate, compounding problems:

### 4a. Product **description** has no Arabic field anywhere — schema, API, or admin form
- `Product.nameAr` exists end-to-end (DB → API → admin form → storefront), but
  `descriptionAr` **does not exist at all**:
  - DB: `server/prisma/schema.prisma` `Product` model has `description String? @db.Text` with
    no `descriptionAr` column.
  - Admin form: [admin/Products.tsx:627-639](../src/pages/admin/Products.tsx#L627-L639) has a
    single `<textarea>` bound to `form.description`, no Arabic counterpart (compare to the name
    field just above it, [admin/Products.tsx:480-506](../src/pages/admin/Products.tsx#L480-L506),
    which correctly has "(EN)"/"(AR)" side-by-side inputs).
  - Storefront: [ProductView.tsx:517-519](../src/pages/ProductView.tsx#L517-L519) renders
    `product.description` unconditionally — there's nothing to conditionally select even if
    the language is Arabic, because no `descriptionAr` exists to select.
  - **This is a full-stack gap** (schema → API → admin UI → storefront), not just a frontend
    oversight. Fixing it needs a Prisma migration (`descriptionAr String? @db.Text`), an admin
    textarea, and updating `ProductView.tsx` to pick `descriptionAr` when `i18n.language === "ar"`
    the same way it already does for `product.nameAr` two lines away (line 127).

### 4b. Hardcoded English strings on the product detail page, bypassing i18n entirely
[ProductView.tsx:508-515](../src/pages/ProductView.tsx#L508-L515):
```tsx
<div className="anp-chips">
  <span className="anp-chip">100% Natural</span>
  <span className="anp-chip">Hand-Selected</span>
  {product.isAvailable
    ? <span className="anp-chip" ...>In Stock</span>
    : <span className="anp-chip" ...>Out of Stock</span>
  }
</div>
```
These are literal JSX text, not `t(...)` calls — they show "100% Natural" / "Hand-Selected" /
"In Stock" / "Out of Stock" even when the whole rest of the page is in Arabic. The matching
Arabic translations **already exist and are unused**: `natural_100` → `"100% طبيعي"`
([i18n.ts:440](../src/i18n.ts#L440)), `hand_selected` → `"مُنتقى يدويًا"`
([i18n.ts:387](../src/i18n.ts#L387)), and the already-correct `out_of_stock` → `"نفذت الكمية"`
([i18n.ts:59](../src/i18n.ts#L59), a *different* key from the broken duplicate at line 683 —
see §4c). Fix is a one-line swap per chip: `{t("natural_100")}`, `{t("hand_selected")}`,
`{t("out_of_stock")}`. `in_stock` needs its Arabic value fixed first (see 4c) before it can be
swapped in the same way.

### 4c. A few i18n keys are left untranslated inside the Arabic resource block itself
In [i18n.ts](../src/i18n.ts), inside the `ar:` translation object (not the `en:` one), these
keys still hold **English** text instead of Arabic:
- `in_stock: "In Stock"` ([i18n.ts:376](../src/i18n.ts#L376))
- `out_of_stock_2: "Out of Stock"` ([i18n.ts:377](../src/i18n.ts#L377))
- `out_of_stock: "Out of Stock"` ([i18n.ts:683](../src/i18n.ts#L683))

These need real Arabic values (e.g. `in_stock` → "متوفر", matching the existing
`out_of_stock: "نفذت الكمية"` at [i18n.ts:59](../src/i18n.ts#L59) which — confusingly — is a
*different*, already-correctly-translated key with the same English meaning; the duplicate
`out_of_stock` / `out_of_stock_2` keys look like accumulated dead duplication worth
consolidating while this is being fixed).

### 4d. Cart line-item name loses its Arabic translation depending on where it was added
- [ProductView.tsx:86-96](../src/pages/ProductView.tsx#L86-L96) `handleAddToCart` correctly
  passes the resolved bilingual name (`isRtl ? product.nameAr || product.name : product.name`).
- [Products.tsx:54-72](../src/pages/Products.tsx#L54-L72) and
  [CategoryView.tsx:47-65](../src/pages/CategoryView.tsx#L47-L65) `handleAddToCart` both pass
  the raw `product.name` (always English), even though the same components already compute and
  display the bilingual name on the card itself.
- Net effect: add an item to the cart from the Products grid or a Category page while in
  Arabic mode → the cart ([Cart.tsx:391,400](../src/pages/Cart.tsx#L391)) shows the English
  name. Add the same item from its Product detail page → the cart shows the Arabic name. Same
  bug family as 4a–4c: partial bilingual coverage that needs to be made consistent.

---

## Suggested order of work (not started — for discussion)

1. **RTL fix on Layout.tsx** (§3) — biggest visible impact, same pattern already proven on
   Landing2.
2. **Hardcoded EN chips + untranslated ar keys** (§4b, §4c) — small, low-risk, immediate wins.
3. **Cart item name consistency** (§4d) — small fix, same root cause as 4b/4c (inconsistent
   bilingual handling), good to batch with it.
4. **`descriptionAr` schema + admin + storefront** (§4a) — bigger: needs a migration, so do
   this deliberately rather than bundled with the small fixes above.
5. **Landing page copy swap** (§1) and **product Arabic descriptions** (§2) — pure content
   entry, can happen independently of the code fixes above, but §2 is blocked on §4a existing
   first (nowhere to put the Arabic description otherwise).
