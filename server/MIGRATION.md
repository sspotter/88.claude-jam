# Firebase → PostgreSQL Migration

This document describes the migration of the Jamhawi eCommerce app from a
**Firebase (Firestore + Firebase Auth + Firebase Storage, accessed directly
from the browser)** architecture to a **PostgreSQL + Express REST API** backend
located in this `server/` folder.

It is written so the same migration can be reproduced when porting another
version of the project.

---

## 1. Why we migrated

The original app talked to Firebase directly from the React client:

- **Firestore** held `products`, `categories`, `offers`, `orders`, `settings`,
  and `admins` collections. Reads/writes happened in the browser via the
  Firebase client SDK.
- **Firebase Auth** gated the admin area.
- **Firebase Storage** held product images.
- **`firestore.rules`** was the only thing protecting the data — a large,
  hand-written ruleset enforcing per-document validation and an `isAdmin()`
  check (hard-coded admin emails + an `admins/{uid}` lookup).

Problems this caused:

- Business logic and validation lived in security rules, which are hard to test
  and easy to get wrong (the data was effectively only as safe as the rules).
- No server-side place for payment webhooks, secrets, or trusted mutations.
- Vendor lock-in and per-read pricing.

The migration moves all data access behind a trusted Express API backed by
PostgreSQL (via Prisma), with JWT-based admin auth and local disk image uploads.

---

## 2. Before vs. after

| Concern | Before (Firebase) | After (this server) |
| --- | --- | --- |
| Database | Firestore (NoSQL documents) | PostgreSQL (relational, via Prisma) |
| Data access | Firebase client SDK in the browser | REST API (`/api/*`) over `fetch` |
| Authorization | `firestore.rules` `isAdmin()` | `requireAdmin` middleware (JWT) |
| Admin auth | Firebase Auth | bcrypt password + signed JWT (7d) |
| Image storage | Firebase Storage | Local disk `uploads/`, served at `/uploads` |
| Realtime order status | Firestore `onSnapshot` | Server-Sent Events (`/api/orders/:id/stream`) |
| Timestamps | epoch-ms numbers in documents | `DateTime` columns, serialized back to epoch-ms |

**Key compatibility decision:** the API serializes rows so the JSON shape stays
**identical to the old Firestore document shape**. `DateTime` columns are
converted to epoch-ms numbers, and the order `coupon` object is reconstructed
from its two flattened columns. This means the frontend's sorting, formatting,
and type contracts did **not** have to change — only the data source did
(`src/lib/firebase/*` was replaced by `src/lib/api/client.ts`).

---

## 3. Target architecture

```
Browser (React/Vite)
  │   src/lib/api/client.ts   ← single API client, injects admin JWT
  ▼
Express server  (server/)
  ├── /api/auth        auth.routes.ts     login, me
  ├── /api             catalog.routes.ts  public reads (products, categories, coupons, theme)
  ├── /api/orders      order.routes.ts    checkout, status, SSE stream
  ├── /api/payments    payment.routes.ts  Paymob webhook
  ├── /api/admin       admin.routes.ts    guarded CRUD + uploads + import + analytics
  ├── /uploads         static product images
  └── /health
        │   Prisma Client
        ▼
   PostgreSQL
```

Supporting modules:

- `src/config/prisma.ts` — singleton `PrismaClient` (replaces Firebase Admin init).
- `src/middleware/requireAdmin.ts` — Bearer-JWT guard (replaces `isAdmin()` rule).
- `src/services/auth.service.ts` — bcrypt login + JWT sign/verify.
- `src/lib/serialize.ts` — row → Firestore-compatible JSON.
- `src/lib/orderEvents.ts` — in-process pub/sub feeding the SSE stream
  (replaces Firestore `onSnapshot`).

---

## 4. Data model (Prisma → PostgreSQL)

The Firestore collections map to the following tables (see
`prisma/schema.prisma`). Original Firestore document IDs are preserved as the
primary keys so foreign keys stay intact.

| Firestore collection | Table | Notes |
| --- | --- | --- |
| `admins` | `Admin` | now stores a bcrypt `passwordHash` instead of relying on Firebase Auth |
| `categories` | `Category` | added `image`, `isHidden` |
| `products` | `Product` | added `pricingType`; FK to `Category`; indexed `categoryId` |
| `offers` | `Offer` | `title` is used as the coupon code; indexed `title` |
| `orders` | `Order` | nested `items[]` split into `OrderItem`; `coupon` flattened into `couponCode` + `couponDiscountPercentage`; indexed `createdAt` |
| (order `items[]`) | `OrderItem` | one row per line item; cascade-deletes with its `Order`; stores name/price **snapshots** at order time |
| `settings` | `Setting` | `value` is a JSON column (e.g. theme) |

Notable transformations:

- **Document arrays → child tables.** Each `Order.items[]` array element becomes
  an `OrderItem` row (`onDelete: Cascade`).
- **Nested objects → columns.** The order `coupon: { code, discountPercentage }`
  object is flattened into two nullable columns and rebuilt on read.
- **Numeric timestamps → `DateTime`.** Firestore stored `createdAt`/`paidAt`/
  `failedAt` as epoch-ms numbers; these become `DateTime` columns and are
  serialized back to epoch-ms by `serialize.ts`.

Schema history lives in `prisma/migrations/`:

1. `20260616174511_jam` — initial schema (all tables).
2. `20260616180426_add_import_fields` — adds `Category.image`,
   `Category.isHidden`, `Product.pricingType` (needed by the bulk import).

---

## 5. The one-time data import

The actual Firestore → Postgres copy is performed by
`src/scripts/migrate-from-firestore.ts` (run via `npm run migrate-from-firestore`).

What it does:

1. Connects to Firestore using the **same** Firebase Admin credentials the old
   server used (`FIREBASE_SERVICE_ACCOUNT_JSON`, or
   `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`, or
   the local emulator via `FIRESTORE_EMULATOR_HOST`).
2. Copies collections in **FK-safe order**: `categories → products → offers →
   orders → settings`.
3. Uses `prisma.*.upsert({ where: { id } })` keyed on the original document ID,
   so the script is **idempotent** — re-running it won't duplicate rows.
4. Splits each order's `items[]` into `OrderItem` rows and flattens `coupon`.
5. Skips products missing a `categoryId` (logged as a warning) to avoid FK
   violations.
6. **Verifies** by comparing source vs. destination row counts and printing a
   ✅/❌ per collection at the end.

> The Firebase credentials are only needed for this one run. After a successful
> import, remove the `FIREBASE_*` variables from `server/.env`.

### 5a. Settings / pricing import (no credentials needed)

`migrate-from-firestore.ts` only copies the `settings` collection. The storefront
keeps **three** further pieces of configuration in Firestore that the Admin SDK
import does not cover:

| Firestore source | Postgres `Setting` row | Consumed by |
| --- | --- | --- |
| `settings/theme` doc | `theme` → `{ selectedTheme }` | `GET /api/settings/theme` |
| `currency_rates/*` collection (+ `_sync_meta`) | `currency_rates` → `{ rates[], syncMeta }` | `GET /api/pricing/rates` |
| `product_prices/*` collection | `product_prices` → `{ prices[] }` | `GET /api/pricing/product-prices` |

These collections are **public-read** per `firestore.rules`, so the dedicated
script `src/scripts/migrate-settings-from-firestore.ts`
(run via `npm run migrate-settings-from-firestore`) reads them with the public
Firebase **web** SDK config — no service-account credentials required.

Two things worth noting when reproducing:

- The live store uses a **named** Firestore database
  (`FIRESTORE_DATABASE_ID`, default `ai-studio-…`), not `(default)`.
- Firestore field names are snake_case; the script remaps them to the camelCase
  shapes the REST API and `src/lib/pricing/*` services expect (e.g.
  `product_id → productId`, `synced_at → syncedAt`, `_sync_meta.last_sync_at →
  syncMeta.lastSyncAt`). It is idempotent — it upserts the three `Setting` rows.

> **Order line items:** the `orders` collection is admin-gated in
> `firestore.rules`, so it cannot be re-read with the public web config. Orders
> imported by the Admin SDK run carry their `OrderItem` rows; if historical
> orders are missing items, re-import them with valid `FIREBASE_*` admin
> credentials (or via the admin dashboard's bulk import).

---

## 6. Reproducing the migration (runbook)

For porting another version of the project:

1. **Provision PostgreSQL** and set `DATABASE_URL` in `server/.env`
   (see `server/.env.example`).
2. **Install & generate:**
   ```bash
   cd server
   npm install
   npm run prisma:generate
   ```
3. **Create the schema:**
   ```bash
   npx prisma migrate deploy     # apply existing migrations
   # or, when changing the schema:  npm run prisma:migrate
   ```
4. **Seed the first admin** (replaces creating a Firebase Auth user):
   ```bash
   npm run seed-admin -- admin@jamhawi.com "SuperSecret123"
   # or set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env
   ```
5. **Import existing data from Firestore** (optional — only if there is live
   Firestore data to bring over). Temporarily add the `FIREBASE_*` credentials
   to `.env`, then:
   ```bash
   npm run migrate-from-firestore
   ```
   Confirm all counts show ✅, then remove the `FIREBASE_*` vars.
5a. **Import settings / pricing** (theme, currency rates, manual product prices).
   No credentials needed — these collections are public-read:
   ```bash
   npm run migrate-settings-from-firestore
   ```
6. **Run the server:**
   ```bash
   npm run dev      # tsx watch (development)
   # production:  npm run build && npm start
   ```
7. **Point the frontend at the API.** Set `VITE_API_URL`
   (defaults to `http://localhost:5000/api`). The client uses
   `src/lib/api/client.ts`; the old `src/lib/firebase/*`,
   `firebase-applet-config.json`, and `firestore.rules` are removed.

---

## 7. Environment variables

From `server/.env.example`:

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `FRONTEND_URL` | CORS origin for the storefront |
| `DATABASE_URL` | PostgreSQL connection string (Prisma) |
| `JWT_SECRET` | signs admin JWTs — **set a long random value** |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | optional, used by `seed-admin` |
| `UPLOAD_DIR` | local dir for product images (default `uploads`) |
| `PUBLIC_BASE_URL` | base URL the frontend uses to load uploaded images |
| `PAYMOB_SECRET_KEY` / `PAYMOB_HMAC_SECRET` / `PAYMOB_CARD_INTEGRATION_ID` / `PAYMOB_WALLET_INTEGRATION_ID` | Paymob payment gateway |
| `BUSINESS_PHONE` | WhatsApp checkout number |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_SERVICE_ACCOUNT_JSON` | **migration only** — remove after import |

---

## 8. What replaced each Firebase feature

| Firebase feature | Replacement | File(s) |
| --- | --- | --- |
| Firestore reads/writes | Prisma queries behind REST routes | `server/src/routes/*`, `server/src/config/prisma.ts` |
| `firestore.rules` validation | request handling + Prisma schema constraints | `server/src/routes/*`, `prisma/schema.prisma` |
| `isAdmin()` rule | `requireAdmin` JWT middleware | `server/src/middleware/requireAdmin.ts` |
| Firebase Auth | bcrypt + JWT login | `server/src/services/auth.service.ts`, `auth.routes.ts` |
| Firebase Storage | Multer disk uploads at `/uploads` | `server/src/routes/admin.routes.ts` (`/uploads`) |
| Firestore `onSnapshot` (order status) | Server-Sent Events + in-process emitter | `server/src/lib/orderEvents.ts`, `order.routes.ts` |
| Firebase client SDK in browser | central `fetch` API client (injects JWT) | `src/lib/api/client.ts` |

---

## 9. API surface (for reference)

Public (no auth):

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/products`, `GET /api/products/:id`
- `GET /api/categories`, `GET /api/categories/:id`
- `GET /api/coupons/validate`
- `GET /api/settings/theme`
- `POST /api/orders/checkout`, `GET /api/orders/:id/status`, `GET /api/orders/:id/stream` (SSE)
- `POST /api/payments/paymob-webhook`

Admin (require `Authorization: Bearer <jwt>`):

- Products: `POST/PUT/DELETE /api/admin/products[/:id]`, `POST /api/admin/products/bulk`, `PATCH /api/admin/products/:id/stock`
- Categories: `POST/PUT/DELETE /api/admin/categories[/:id]`
- Offers: `GET/POST/PUT/DELETE /api/admin/offers[/:id]`
- Orders: `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`, `POST /api/admin/orders/bulk-ship`, `POST /api/admin/orders`, `DELETE /api/admin/orders/:id`
- Settings: `PUT /api/admin/settings/theme`
- Insights: `GET /api/admin/customers`, `GET /api/admin/analytics`
- Bulk import: `POST /api/admin/import`
- Uploads: `POST /api/admin/uploads`

---

## 10. Verification checklist

- [ ] `prisma migrate deploy` applied cleanly; tables exist.
- [ ] `seed-admin` created an admin; `POST /api/auth/login` returns a token.
- [ ] `migrate-from-firestore` printed ✅ for every collection (counts match).
- [ ] `migrate-settings-from-firestore` ran; `GET /api/settings/theme`,
      `/api/pricing/rates`, and `/api/pricing/product-prices` return data.
- [ ] Spot-check that document IDs and order line items survived the import.
- [ ] Storefront loads products/categories from `/api` (not Firebase).
- [ ] Admin area mutations work with the JWT.
- [ ] Order status updates stream live via SSE on the checkout-success page.
- [ ] `FIREBASE_*` credentials removed from `server/.env` after import.
