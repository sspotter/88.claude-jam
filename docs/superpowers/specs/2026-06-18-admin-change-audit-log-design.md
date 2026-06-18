# Admin Change / Audit Log — Design (Phase 2)

**Date:** 2026-06-18
**Status:** Approved design (pending spec review)

## Summary

Record an immutable audit trail of admin changes — **who · when · old→new** — and
expose it on an admin "Activity Log" page. Phase 1 made base currency, rates, and
pricing admin-editable; this phase makes those edits (plus catalog CRUD)
auditable.

## Goals

- Every covered admin mutation writes one `AuditLog` row capturing actor, time,
  action, entity, and full before/after snapshots.
- Admins can browse the log newest-first, filter by entity/action, and expand a
  row to see the before→after diff.
- Audit writes are **best-effort**: a logging failure never breaks or rolls back
  the underlying mutation.

## Coverage

Logged admin actions (all live in `server/src/routes/admin.routes.ts`):

| Entity | Hook point(s) | action values |
|--------|---------------|---------------|
| `base_currency` | `PUT /settings/base-currency` | update |
| `currency_settings` | `PUT /settings/currency` | update |
| `currency_rates` | `PUT /pricing/rates` | update |
| `product_prices` | `PUT /pricing/product-prices`, `DELETE /pricing/product-prices` | update |
| `product` | product create / update / delete | create, update, delete |
| `category` | category create / update / delete | create, update, delete |
| `offer` | offer create / update / delete | create, update, delete |

**Out of scope:** order status changes, admin login/auth events, uploads.

## Non-Goals (YAGNI)

- No retention/pruning (keep all rows; revisit if volume becomes a problem).
- No revert/undo from the log.
- No real-time streaming; the page fetches on load / via paging.
- No per-field diff computation server-side — full `before`/`after` JSON is
  stored and the client renders the comparison.

## Data Model

New Prisma model (new migration via `prisma migrate dev`):

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  createdAt  DateTime @default(now())
  actorId    String
  actorEmail String
  action     String   // "create" | "update" | "delete"
  entity     String   // see Coverage table
  entityId   String?  // row id or setting key; null when not applicable
  before     Json?    // prior state; null on create
  after      Json?    // new state; null on delete

  @@index([entity])
  @@index([createdAt])
}
```

- `before`/`after` hold the relevant object. For settings entities the value is
  the setting's stored JSON (e.g. `{ base }`, the `currency_settings` object, the
  rates payload, the product-prices payload). For catalog entities it is the
  serialized row.
- `entityId`: the row `id` for catalog entities; the setting key (e.g.
  `"base_currency"`) for settings entities.

## Server

### `audit.service.ts` (new)

```ts
interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: "create" | "update" | "delete";
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

// Best-effort: catches and logs its own errors, never throws.
async function recordAudit(entry: AuditEntry): Promise<void>;

interface AuditQuery { entity?: string; action?: string; limit?: number; offset?: number; }
// Returns newest-first with a total count. limit clamped to [1, 100] (default 50); offset >= 0.
async function listAuditLogs(query: AuditQuery): Promise<{ logs: AuditLog[]; total: number }>;
```

- `recordAudit` wraps its Prisma write in try/catch; on failure it `console.error`s
  and returns — the caller's mutation is unaffected.
- A small pure helper `normalizeAuditQuery(raw)` clamps `limit`/`offset` and is the
  unit-tested seam.

### Instrumentation pattern

Each covered handler, after a successful mutation, calls `recordAudit`. The actor
comes from `req.admin` (`{ adminId, email }`), guaranteed present by the
`requireAdmin` guard already applied to the whole admin router.

- **Settings handlers** (`base_currency`, `currency_settings`, `currency_rates`,
  `product_prices`): read the existing `Setting.value` **before** the upsert to
  capture `before`; `after` is the new value. For `DELETE /pricing/product-prices`,
  `before` = prior payload, `after` = payload after removal.
- **Catalog handlers**: `create` → `before: null`, `after: created row`;
  `update` → read the row first for `before`, `after: updated row`; `delete` →
  `before: row`, `after: null`. Reuse the existing `serialize*` helpers where the
  routes already use them.

`recordAudit` is awaited but its failure is swallowed inside the service, so the
handler's response is never affected.

### Read route

`GET /api/admin/audit-logs?entity=&action=&limit=&offset=` (admin-guarded, in
`admin.routes.ts`) → `{ logs, total }` via `listAuditLogs`.

## Client

### `src/lib/api/audit.ts` (new)

```ts
interface AuditLogRow {
  id: string; createdAt: string; actorEmail: string;
  action: string; entity: string; entityId: string | null;
  before: unknown; after: unknown;
}
function listAuditLogs(params: { entity?: string; action?: string; limit?: number; offset?: number }):
  Promise<{ logs: AuditLogRow[]; total: number }>;  // admin-authed via apiFetch(..., { auth: true })
```

### `src/pages/admin/AuditLog.tsx` (new) — "Activity Log"

- Table, newest-first: **time · actor · action · entity · entityId**.
- Each row expands to show `before` → `after` as formatted JSON (simple
  side-by-side or stacked `<pre>` blocks).
- Filters: entity dropdown (the coverage set) and action dropdown
  (create/update/delete); "All" clears each.
- Pagination via `limit`/`offset` and the returned `total`.
- Matches the existing admin page card/table styling.

### Routing & nav

- Add `{ path: "audit", element: <AdminAuditLog /> }` under the admin layout route
  group in `src/App.tsx` (mirroring `orders`, `pricing`, etc.).
- Add an "Activity Log" entry to the admin navigation, alongside the other admin
  links.
- New i18n keys (en + ar): page title, column headers, action/entity labels,
  filter labels, empty state.

## Data Flow

1. Admin performs a covered mutation → handler reads `before`, mutates, calls
   `recordAudit({ actor, action, entity, entityId, before, after })`.
2. `recordAudit` inserts an `AuditLog` row (best-effort).
3. Admin opens **Activity Log** → `GET /api/admin/audit-logs` → table renders;
   filtering/paging re-queries.

## Error Handling

- Audit write failure: logged server-side, swallowed; mutation already succeeded.
- `listAuditLogs` invalid params: normalized (clamped), never 400 on bad paging.
- Client fetch failure: the page shows an error/empty state via the existing
  toast/error pattern; the rest of the admin app is unaffected.

## Testing

- **Server unit tests (vitest):**
  - `normalizeAuditQuery` clamps `limit` to [1,100] (default 50), floors `offset`
    at 0, passes through valid `entity`/`action`.
  - An audit-entry shaping check: given a settings before/after pair, the entry has
    the expected `entity`, `action`, `entityId`, `before`, `after`.
- **DB-touching paths** (`recordAudit` insert, `listAuditLogs` query, the new
  migration) verified via `tsc` + manual smoke (they require Postgres up).
- **Manual/UI check:** change the base currency and edit a product → two new rows
  appear in Activity Log with correct actor and before→after; filtering by entity
  narrows the list.

## Implementation Notes

- The migration is created with `npm run prisma:migrate` (`prisma migrate dev`)
  in `server/`, which needs the database running.
- Keep `audit.service.ts` focused (record + list + normalize); do not fold
  unrelated settings logic into it.
