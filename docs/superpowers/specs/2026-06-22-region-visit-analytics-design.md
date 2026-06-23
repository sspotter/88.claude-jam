# Region / Visit Analytics — Design Spec

**Date:** 2026-06-22
**Branch:** feat/admin-base-currency
**Status:** Approved (brainstorming) → ready for implementation plan

## Summary

Capture where visitors are located when they open the storefront, and give the
admin a date-filterable chart of the most-visited regions. One visit is recorded
per browser session. Region is resolved server-side from the visitor's IP
(geo-IP), falling back to a client-supplied locale/timezone signal when the IP is
not routable (e.g. localhost in development) or the lookup fails. Visits are
stored one row per session in a dedicated `VisitEvent` table; the admin Analytics
page renders a "Visits by Region" bar chart that reuses the page's existing
week/month/year/all filter.

This spec covers **region/visit analytics only**. (The configurable product
weights feature was a separate, already-completed spec.)

## Decisions (from brainstorming)

- **Region source:** geo-IP with locale/timezone fallback.
- **Visit unit:** one per browser session (`sessionStorage` flag).
- **Chart scope:** date-filterable (week / month / year / all), matching the
  existing Analytics page filters.
- **Storage:** dedicated `VisitEvent` Prisma table (one row per session),
  mirroring the existing `AuditLog` table. **Raw IP is never persisted** — only
  the derived country, the resolution source, and the timestamp.

## Data model

Add to `server/prisma/schema.prisma`:

```prisma
model VisitEvent {
  id        String   @id @default(uuid())
  country   String   // ISO 3166-1 alpha-2, or "ZZ" for unknown
  source    String   // "geoip" | "locale" | "unknown"
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([country])
}
```

A Prisma migration creates the table. No backfill — counts accrue from
deployment forward.

## Capture flow

### Client — `src/lib/analytics/recordVisit.ts`

```
recordVisit():
  if sessionStorage['visit_recorded'] is set: return
  set sessionStorage['visit_recorded'] = '1'   // set first, so a failed POST doesn't retry-loop the session
  POST /api/analytics/visit { locale: navigator.language,
                              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  swallow all errors (fire-and-forget; never blocks render)
```

Called once from `src/App.tsx` (effect on mount). The session flag is set
*before* the request so a server hiccup cannot cause repeated posts within a
session.

### Server — `POST /api/analytics/visit` (public, on `catalogRouter` → `/api/analytics/visit`)

1. Extract client IP: first entry of `X-Forwarded-For` if present, else
   `req.socket.remoteAddress`.
2. Resolve country (see Region resolution).
3. `prisma.visitEvent.create({ data: { country, source } })`.
4. Respond `204` (empty). Any error → `204` as well (analytics must never
   surface errors to the storefront); log server-side.

Add `app.set('trust proxy', true)` in `server/src/index.ts` so `X-Forwarded-For`
is honored in production behind a proxy. In local dev the IP is loopback, which
deterministically triggers the locale fallback.

## Region resolution

Two server units with one clear responsibility each.

### `server/src/lib/localeRegion.ts` (pure, no I/O)

```
countryFromLocale(locale?: string): string | null
  // 'en-EG' -> 'EG'; 'ar' -> null (no region subtag)
  // returns the uppercased region subtag if present and 2 letters, else null

countryFromTimezone(tz?: string): string | null
  // compact IANA-timezone -> ISO country map for the store's markets, e.g.:
  // 'Africa/Cairo'->'EG', 'Asia/Dubai'->'AE', 'Asia/Riyadh'->'SA',
  // 'Asia/Qatar'->'QA', 'Asia/Kuwait'->'KW', 'Asia/Bahrain'->'BH',
  // 'Europe/London'->'GB', 'America/New_York'->'US', plus a handful more.
  // returns null if unmapped.

countryFromClientSignal(locale?, timezone?): string | null
  // countryFromLocale(locale) ?? countryFromTimezone(timezone) ?? null
```

### `server/src/services/geoip.service.ts` (network + cache)

```
isPublicIp(ip?: string): boolean
  // false for undefined, loopback (127.0.0.1, ::1), and private ranges
  // (10/8, 172.16/12, 192.168/16, 169.254/16, fc00::/7)

resolveCountryFromIp(ip?: string): Promise<string | null>
  // if !isPublicIp(ip): return null
  // check in-memory cache (Map<ip, { country, expires }>), TTL ~1h, size-capped (~5000)
  // else fetch `https://ipwho.is/${ip}` with a ~1500ms AbortController timeout
  //   on success + body.success !== false: country = body.country_code (2-letter); cache + return
  //   on any error/timeout/invalid: return null
```

(`ipwho.is` is keyless and free. The provider URL is a single constant so it can
be swapped.)

### `server/src/services/visit.service.ts`

```
resolveVisitCountry({ ip, locale, timezone }):
  Promise<{ country: string; source: 'geoip' | 'locale' | 'unknown' }>
  geo = await resolveCountryFromIp(ip)
  if geo: return { country: geo, source: 'geoip' }
  loc = countryFromClientSignal(locale, timezone)
  if loc: return { country: loc, source: 'locale' }
  return { country: 'ZZ', source: 'unknown' }

recordVisit({ ip, locale, timezone }): Promise<void>
  { country, source } = await resolveVisitCountry(...)
  prisma.visitEvent.create({ data: { country, source } })

getVisitsByRegion(range): Promise<Array<{ country: string; count: number }>>
  where = { createdAt: { gte: cutoffForRange(range, new Date()) } }   // omit gte when range==='all'
  rows = prisma.visitEvent.groupBy({ by: ['country'], _count: { _all: true }, where })
  return rows.map(r => ({ country: r.country, count: r._count._all }))
            .sort((a, b) => b.count - a.count)

cutoffForRange(range, now): Date | null   // pure, unit-tested
  week  -> now - 7d
  month -> now - 1 month
  year  -> now - 1 year
  all   -> null
```

## Admin aggregation endpoint

`GET /api/admin/analytics/visits?range=week|month|year|all` (on the guarded
`adminRouter`, so it inherits admin auth):

- Validate `range`, defaulting to `month`; call `getVisitsByRegion(range)`.
- Respond `{ visits: [{ country, count }] }`.

## Frontend chart — new card in `src/pages/admin/Analytics.tsx`

- A **"Visits by Region"** card placed in the existing chart grid.
- Reuses the page's existing `dateFilter` state. A dedicated effect fetches
  `getVisitsByRegion(dateFilter)` (added to `src/lib/api/admin.ts`) whenever
  `dateFilter` changes, into `visitsByRegion` state.
- Renders a recharts **horizontal `BarChart`** (top ~10 countries by count),
  styled like the page's other cards (same container classes, `COLORS`,
  `ResponsiveContainer`, tooltip style).
- Country code → display name via `Intl.DisplayNames(['en'], { type: 'region' })`;
  `'ZZ'` → `"Unknown"`. Bars labeled with the country name.
- Empty state matches the existing "No data available" treatment.
- **Strings:** `Analytics.tsx` currently uses plain English literals (it is not
  wired to i18n/`useTranslation`), so the new card uses plain English literals
  too (card title "Visits by Region", "Unknown") to stay consistent with the
  rest of the page. No i18n keys are added.

## Client API — `src/lib/api/admin.ts`

```
export const getVisitsByRegion = (range: 'week'|'month'|'year'|'all') =>
  adminFetch<{ visits: { country: string; count: number }[] }>(
    `/api/admin/analytics/visits?range=${range}`,
  )
```

## Testing

Server unit tests (mirroring `currencySettings.test.ts` / `audit.service.test.ts`
style):

- `localeRegion`: `countryFromLocale` (region subtag present / absent / malformed);
  `countryFromTimezone` (mapped / unmapped); `countryFromClientSignal` precedence.
- `geoip.service`: `isPublicIp` truth table (loopback, private ranges, public);
  `resolveCountryFromIp` with a mocked `fetch` — public IP → country, private IP
  → null (no fetch), fetch failure/timeout → null, cache hit avoids a second
  fetch.
- `visit.service`: `resolveVisitCountry` precedence (geoip wins → locale →
  `ZZ`/unknown) with `resolveCountryFromIp` mocked; `cutoffForRange` for each
  range (`all` → null).

## Privacy

- Only `country` (ISO alpha-2), `source`, and `createdAt` are persisted.
- The raw IP is used transiently for the geo-IP lookup and cache key only; it is
  never written to the database or logs.
- No cookies or cross-site identifiers; the session flag is a single
  `sessionStorage` boolean.

## Out of scope

- City-level or sub-country geo.
- Per-page-path or per-product visit breakdowns.
- Bot/crawler filtering beyond session-gating.
- Real-time / streaming updates (chart loads on demand).
- Raw-IP retention or per-visitor identity tracking.
