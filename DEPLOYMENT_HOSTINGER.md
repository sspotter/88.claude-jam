# Jamhawi — Hostinger Shared Hosting Deployment

Target: **jamhawi.com** on Hostinger Business plan (username `u238610321`)  
Stack: Vite/React + Express/Prisma + Hostinger MySQL  
Method: Hostinger MCP `deployJsApplication` (no SSH required)

---

## Production topology

| Thing | Value |
|---|---|
| Domain | `https://jamhawi.com` |
| Hosting | Hostinger Business v3 plan, username `u238610321` |
| Database | MySQL `u238610321_jamhawi_prod`, user `u238610321_jamhawi_app` |
| Entry point | `server.js` (root) → `server/start.js` → `server/dist/index.js` |
| Node version | 20 |
| React build | `dist/` served by Express static middleware (same-origin, no nginx) |

---

## What was changed from the original codebase

### `server/prisma/schema.prisma`
Migrated from PostgreSQL → MySQL. Added `@db.Text` on long fields:
```prisma
datasource db {
  provider = "mysql"    // was "postgresql"
  url      = env("DATABASE_URL")
}

// These fields need @db.Text to avoid MySQL's 191-char index limit:
description String? @db.Text   // Product
address     String  @db.Text   // Order
notes       String? @db.Text   // Order
```

### `server/package.json`
Moved `prisma` from `devDependencies` → `dependencies` (required at runtime for `db push`).

### `server/src/index.ts`
Three additions:

1. ESM `__dirname` shim (required because the project uses `"type": "module"`):
```ts
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

2. CORS reads `FRONTEND_URL` as comma-separated list:
```ts
const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",").map((u) => u.trim());
app.use(cors({ origin: [...frontendUrls, "https://accept.paymob.com"], ... }));
```

3. Express serves the React build before `app.listen`:
```ts
const distPath = path.resolve(__dirname, "../../dist"); // server/dist/ → project root dist/
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
```

### `server/start.js` *(new file)*
Startup wrapper: syncs DB schema, then starts Express:
```js
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  execSync("node_modules/.bin/prisma db push --skip-generate --accept-data-loss", {
    cwd: __dirname, stdio: "inherit", env: { ...process.env },
  });
} catch (err) {
  console.error("[Startup] DB push failed:", err.message);
  process.exit(1);
}

await import("./dist/index.js");
```

### `server.js` *(new file at project root)*
Hostinger auto-detects `server.js` as the entry point. Simply delegates:
```js
import "./server/start.js";
```

### `package.json` (root)
```json
"postinstall": "npm install --prefix server",
"build": "vite build && npm run --prefix server build",
"start": "node server/start.js",
```
The `postinstall` hook is critical — Hostinger only runs `npm install` at the root, so without it `server/node_modules` never gets populated and `prisma` / `tsc` fail.

### `.env.production` *(new file, not committed to git)*
Tells Vite to use same-origin API calls in the production bundle:
```
VITE_API_URL=/
```

### `package-lock.json`
Fixed a corrupt `tapable@2.3.3` integrity hash that causes `EINTEGRITY` during `npm install`:
- Line containing `tapable`: change `CUiAEDIfm2` → `CUieGpIfm2` in the sha512 hash.

---

## Deploy steps

### Step 1 — Create the archive

From the project root in Git Bash or PowerShell with Python available:

```bash
# 1. Generate file list from git tracking (auto-respects .gitignore)
git ls-files \
  | grep -v -E '^(official logog|futuredesign|server/uploads)/' \
  | grep -v -E '\.(mp4)$' \
  | grep -v -E '^(server/)?\.env$' \
  | grep -v -E '^majalla\.ttf$' \
  > /tmp/jamhawi_filelist.txt

# 2. Add untracked-but-required production files
echo ".env.production" >> /tmp/jamhawi_filelist.txt
echo "server/start.js" >> /tmp/jamhawi_filelist.txt
echo "server.js"       >> /tmp/jamhawi_filelist.txt
```

```python
# build_archive.py — run with: python3 build_archive.py
import zipfile, os

SRC  = r"E:\ZZZZZWORKING_BACKUPZZZZ\jam-olddjamhawyy-local-server\react-example"
OUT  = r"C:\Users\mazen\AppData\Local\Temp\claude\jamhawi_deploy.zip"
LIST = "/tmp/jamhawi_filelist.txt"   # adjust if on Windows: use a Windows path

with open(LIST) as f:
    files = [l.strip() for l in f if l.strip()]

with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for rel in files:
        abs_path = os.path.join(SRC, rel.replace("/", os.sep))
        if os.path.isfile(abs_path):
            zf.write(abs_path, rel)

size = os.path.getsize(OUT) / 1e6
print(f"Archive: {OUT}  ({size:.1f} MB)")
assert size < 50, "Archive exceeds Hostinger's 50 MB limit!"
```

Target size: **~45 MB**. Must stay under 50 MB.

### Step 2 — Deploy via Hostinger MCP

In Claude Code, call the `deployJsApplication` MCP tool:

```
Tool: mcp__hostinger-hosting__hosting_deployJsApplication
  domain:      jamhawi.com
  archivePath: C:\Users\mazen\AppData\Local\Temp\claude\jamhawi_deploy.zip
```

Hostinger auto-detects from the archive:
- `app_type`: express
- `entry_file`: server.js
- `build_script`: build
- `node_version`: 20

The response includes a `build.uuid` — save it for Step 3.

### Step 3 — Monitor the build

Poll logs with:
```
Tool: mcp__hostinger-hosting__hosting_getNodeJSBuildLogsV1
  username: u238610321
  domain:   jamhawi.com
  uuid:     <build_uuid_from_step_2>
  from_line: 0   # increment each poll to get only new lines
```

Expected build sequence (~60 seconds total):
1. `npm install` root — ~400 packages
2. `postinstall` → `npm install --prefix server` — ~438 packages
3. `vite build` — 2832 modules transformed
4. `prisma generate` — Prisma client generated
5. `tsc` — TypeScript compiled to `server/dist/`
6. Build state → `completed`

Check overall status with:
```
Tool: mcp__hostinger-hosting__hosting_listNodeJSBuildsV1
  username: u238610321
  domain:   jamhawi.com
```

---

## Step 4 — Set environment variables in hPanel

Go to **hPanel → Hosting → jamhawi.com → Node.js → Environment Variables** and add:

### Required (app crashes on start without these)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `mysql://u238610321_jamhawi_app:Jamhawi%40MySQL2026%21@localhost:3306/u238610321_jamhawi_prod` |
| `JWT_SECRET` | Any 64-char random string — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://jamhawi.com` |

### Paymob

| Variable | Value |
|---|---|
| `PAYMOB_SECRET_KEY` | From Paymob dashboard |
| `PAYMOB_PUBLIC_KEY` | From Paymob dashboard |
| `PAYMOB_HMAC_SECRET` | From Paymob dashboard |
| `PAYMOB_CARD_INTEGRATION_ID` | Card integration ID |
| `PAYMOB_WALLET_INTEGRATION_ID` | Wallet integration ID |
| `PAYMOB_CARD_INTEGRATION_ID_USD` | USD card ID (if used) |

### Optional

| Variable | Value |
|---|---|
| `PUBLIC_BASE_URL` | `https://jamhawi.com` |
| `UPLOAD_DIR` | Leave unset — defaults to `uploads/` inside app directory |

Restart the Node.js app from hPanel after saving env vars.

---

## Step 5 — Seed the admin account (first deploy only)

The MySQL database starts completely empty. Add these **temporarily** to env vars:

```
SEED_ADMIN_EMAIL=admin@jamhawi.com
SEED_ADMIN_PASSWORD=<choose-a-strong-password>
```

Then from hPanel terminal (or SSH if available):
```bash
npm run seed-admin --prefix server
```

Remove `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from env vars after seeding.

---

## Redeployment (future updates)

For any code change, repeat Steps 1–3. The `postinstall` + build pipeline runs fresh each time. No additional steps needed if env vars haven't changed.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `npm install` fails `EINTEGRITY` on `tapable@2.3.3` | The `package-lock.json` has a corrupt hash. Edit line with `CUiAEDIfm2` → `CUieGpIfm2` and redeploy. |
| `prisma: command not found` during build | `postinstall` hook missing from root `package.json`, so `server/node_modules` was never installed. Add `"postinstall": "npm install --prefix server"` and redeploy. |
| Archive upload fails `"must be a file"` error | This happens with `createNodeJSBuildFromArchiveV1`. Use `deployJsApplication` instead — it handles the file upload correctly. |
| App starts but API calls return 404 | Check `FRONTEND_URL` env var; confirm Express routes registered before the SPA catch-all `app.get("*")`. |
| `prisma db push` fails on startup | Check `DATABASE_URL` env var is set and URL-encodes special chars (`@` → `%40`). |
| Uploaded images disappear after redeploy | Known limitation: `uploads/` is inside the app dir, replaced on each deploy. Migrate to Cloudinary for persistent storage. |

---

## Known limitations

- **Image uploads don't persist across deploys.** Each deployment replaces the app directory including `uploads/`. Solution: migrate to Cloudinary.
- **No zero-downtime deploys.** App restarts when the build completes.
- **Double `npm install` every deploy.** The `postinstall` hook reinstalls ~438 server packages even for frontend-only changes (~8 extra seconds).
- **No persistent terminal/SSH.** To run one-off scripts (like seed-admin), use hPanel's built-in terminal or set up a Hostinger cron job.
