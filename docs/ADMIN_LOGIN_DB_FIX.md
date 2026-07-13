# Admin Login Fix — Prisma / MySQL on Hostinger (2026-07-05)

Reference writeup for the admin-login outage on **jamhawi.com**. If admin login
returns 401 (or `/api/settings/*` returns 500), it is almost always a **database
connection problem**, not a wrong password — read on.

> **Recurred on 2026-07-08 — see [Recurrence](#recurrence--2026-07-08) at the
> bottom.** Same root cause, same fix, three days later.

---

## Symptom

- `POST /api/auth/login` → **401 Unauthorized**
- `GET /api/settings/*` → **500 Internal Server Error**
- Response body contains a Prisma error such as:
  - `PANIC: timer has gone away` (`PrismaClientRustPanicError`), or
  - `Authentication failed against database server at 'localhost' / '127.0.0.1' … credentials … are not valid`

### Why the 401 is misleading
`server/src/routes/auth.routes.ts` wraps the whole login in `try/catch` and returns
**401 for any error**, to avoid leaking which part failed:

```ts
} catch (error: any) {
  return res.status(401).json({ error: error.message || "Authentication failed." });
}
```

So a database/engine failure in `prisma.admin.findUnique()` surfaces as a 401 —
**before** the password is ever compared with bcrypt. A 401 here means "the login
query threw," not necessarily "wrong password."

---

## Root causes we hit (in order)

1. **Env not loaded / engine panic.** Running Prisma without `DATABASE_URL` in the
   environment, and the Rust engine panicking under Hostinger's process limits
   (`PANIC: timer has gone away`).
2. **`localhost` vs `127.0.0.1`.** MySQL treats `user@localhost` (socket) and
   `user@127.0.0.1` (TCP) as different accounts. This DB user only authenticates
   over **TCP**, so `localhost` fails with "credentials not valid." Always use
   `127.0.0.1`.
3. **The real killer — the hPanel env-var UI escapes `%`.** The Node.js
   "Environment variables" field in hPanel prepends a backslash to every `%`, so a
   URL-encoded password like `Jamhawi%40MySQL2026%21` was stored as
   `Jamhawi\%40MySQL2026\%21`. Prisma then decoded a wrong password
   (`Jamhawi\@MySQL2026\!`, with literal backslashes) → "credentials not valid."
   Because `@` **must** be `%40` in a connection URL, this is unwinnable through
   the panel as long as the password contains special characters.

---

## The fix (what makes it work)

**Use an alphanumeric-only database password** so the connection URL needs no
`%`-encoding, and the panel has nothing to corrupt.

1. Change the MySQL user password to letters+digits only (no symbols). Done via the
   Hostinger API / hPanel → Databases. Current value: `JamhawiApp2026Kx9Qm4`.
2. Set the hPanel Node.js env var to the **plain** URL (no `%`, no quotes, TCP host):
   ```
   DATABASE_URL=mysql://u238610321_jamhawi_app:JamhawiApp2026Kx9Qm4@127.0.0.1:3306/u238610321_jamhawi_prod
   ```
3. Restart the app:
   ```bash
   touch /home/u238610321/domains/jamhawi.com/nodejs/tmp/restart.txt
   ```

The admin login password is **separate** from the DB password and was unchanged —
no re-seeding needed after this fix.

---

## How to diagnose next time (copy/paste)

All commands run over SSH: `ssh -p 65002 u238610321@<host>`

**1. Read the DB URL the running app actually uses** (ground truth — catches
`localhost`, stray backslashes, stale workers):
```bash
for pid in $(pgrep -f node -u "$USER"); do
  echo "PID $pid cwd=$(readlink /proc/$pid/cwd 2>/dev/null)"
  tr '\0' '\n' < /proc/$pid/environ 2>/dev/null | grep -i '^DATABASE_URL='
done
```
The value must be `…:<alphanumeric-pw>@127.0.0.1:3306/…` with **no backslashes**.

**2. See the real server error** (not just the browser status code):
```bash
curl -s https://jamhawi.com/api/settings/theme; echo
```

**3. Verify DB creds / re-seed the admin** as a standalone process. The SSH shell
does **not** inherit the app's env, so pass `DATABASE_URL` inline:
```bash
cd /home/u238610321/domains/jamhawi.com/nodejs/server
DATABASE_URL='mysql://u238610321_jamhawi_app:JamhawiApp2026Kx9Qm4@127.0.0.1:3306/u238610321_jamhawi_prod' \
  /opt/alt/alt-nodejs20/root/usr/bin/node dist/scripts/seed-admin.js admin@jamhawi.com '<login-password>'
```
`✅ Admin ready` = DB creds are valid and the admin row (bcrypt) is set.

---

## Rules to avoid a repeat

- **DB password = alphanumeric only** on this host (no `@ ! % # …`). The panel
  mangles `%`.
- **Always `127.0.0.1`**, never `localhost`, in `DATABASE_URL`.
- Never insert the admin row via raw SQL/phpMyAdmin — `passwordHash` must be a
  **bcrypt** hash from `dist/scripts/seed-admin.js`, or login always fails.
- After any env-var change, **restart** and re-run diagnostic #1 to confirm the
  live process picked up the clean value.

Working login: `admin@jamhawi.com` / `JamhawiAdmin2026!`

---

## Recurrence — 2026-07-08

Whole site went down (not just admin login): every `/api/*` route returned
500.

**Symptom** — same signature as before, just wider blast radius because by
this point the storefront itself reads settings (`/api/settings/theme`,
`/api/settings/font`, etc.) on every page load:
```
Authentication failed against database server at 127.0.0.1 …
credentials for u238610321_jamhawi_app are not valid
```

**Root cause** — identical to the 2026-07-05 incident: the app process was
healthy (a deploy had gone out at 17:31 UTC), but the MySQL user's password no
longer matched the `DATABASE_URL` the Node.js app had loaded. The database
record shows the password was changed at **17:17 UTC** that day, without the
hPanel env var being updated to match — someone (or some process) rotated the
DB password directly in hPanel → Databases without touching the app's
`DATABASE_URL`.

**Fix — same three steps as before, same password:**
1. Reset the MySQL password for `u238610321_jamhawi_app` back to the
   alphanumeric value `JamhawiApp2026Kx9Qm4` (via Hostinger MCP /
   hPanel → Databases).
2. Confirmed the Node.js env var `DATABASE_URL` still read
   `mysql://u238610321_jamhawi_app:JamhawiApp2026Kx9Qm4@127.0.0.1:3306/u238610321_jamhawi_prod`
   (unchanged from the 2026-07-05 fix — no edit needed this time, since the
   drift was on the database side, not the env var).
3. Restarted the Node.js app for jamhawi.com (`hosting_restartNode_jsApplicationV1`).

**Verified fixed** via a handful of storefront endpoints returning 200 again:
`/api/settings/theme`, `/api/settings/base-currency`, `/api/settings/currency`,
`/api/settings/font`, `/api/categories`, and `/health`.

### Why this keeps happening

The env var didn't drift this time — the **database password itself** did.
That means someone/something with hPanel access is rotating the MySQL user's
password directly (manually, or via a Hostinger security/maintenance flow)
without going through the app's env var. The alphanumeric-password fix
prevents the *encoding* failure mode from 2026-07-05, but it does nothing to
stop the password from being **changed out from under the app** again.

**If this recurs a third time**, the fix is the same, but it's worth checking
*before* re-resetting the password:
- Hostinger account activity / audit log around the timestamp the DB record
  shows as its last-updated time, to identify what changed it.
- Whether any automated credential-rotation policy is enabled on the hosting
  account or the database itself.
- Whether more than one person/integration has hPanel access to
  Databases for this account.

### Rules to avoid a repeat (updated)

- Same as the original rules below, plus:
- Don't just fix-and-move-on a second time — the alphanumeric-password rule
  stops *encoding* corruption, not password *rotation*. If it recurs again,
  find who/what is rotating the password before resetting it a third time.
