# Quick Deploy & Database Guide (Jamhawi Production)

Follow this guide to deploy updates to **jamhawi.com** and ensure the database stays synchronized without hitting connection timeouts, resource limits (`EAGAIN`), or Prisma migration blockages.

---

## ⚡ 1. The Database URL Configuration

Always use **`127.0.0.1`** instead of `localhost` to force a TCP connection, which bypasses socket resolve issues on Hostinger.

### Correct Format for `.env`:
```env
DATABASE_URL=mysql://u238610321_jamhawi_app:Jamhawi%40MySQL2026%21@127.0.0.1:3306/u238610321_jamhawi_prod
```
* **Password Note:** If your database password contains special characters (like `@` or `!`), they must be url-encoded (e.g. `@` -> `%40`, `!` -> `%21`).

---

## 🛠️ 2. How the Database is Deployed (Safe Schema Sync)

### Why we do NOT run `db push` or migrations on startup:
Hostinger shared hosting enforces a strict process/thread limit per account. Spawning Prisma's engine via shell inside the startup routine triggers **`EAGAIN` (Resource temporarily unavailable)**, causing Node.js to crash immediately.

### The Safe Database Deploy Protocol:
If you modify `prisma/schema.prisma` and need to apply schema changes to the live database, run them manually from your local development environment via SSH tunneling or using the Hostinger CLI wrapper, **never on startup**.

To verify or deploy database schema updates without affecting the web process limits:
1. **To Sync / Deploy Manually (from your SSH Terminal):**
   ```bash
   cd /home/u238610321/domains/jamhawi.com/nodejs/server
   
   # Run migrate deploy manually
   /opt/alt/alt-nodejs20/root/usr/bin/node node_modules/prisma/build/index.js migrate deploy
   ```

2. **If you encounter Error P3005 ("Database is not empty"):**
   This means the production database already contains tables, but Prisma's internal tracking is out of sync. Baseline it by marking the migrations as applied:
   ```bash
   /opt/alt/alt-nodejs20/root/usr/bin/node node_modules/prisma/build/index.js migrate resolve --applied 20260616174511_jam
   /opt/alt/alt-nodejs20/root/usr/bin/node node_modules/prisma/build/index.js migrate resolve --applied 20260616180426_add_import_fields
   /opt/alt/alt-nodejs20/root/usr/bin/node node_modules/prisma/build/index.js migrate resolve --applied 20260618000940_add_audit_log
   /opt/alt/alt-nodejs20/root/usr/bin/node node_modules/prisma/build/index.js migrate resolve --applied 20260619043403_add_order_currency
   ```

---

## 🚀 3. Steps to Redeploy Code Updates

### Step A: Archive and Upload
1. Build the production ZIP containing:
   - Root files (including updated `server.js` and `server/start.js`).
   - The compiled frontend `dist/` directory.
   - The `server/` source code.
2. Deploy the archive using Hostinger hPanel File Manager or the Hostinger MCP deployment tool.

### Step B: Restart the App
Passenger reads the file `tmp/restart.txt` to trigger a graceful reload of the Node server processes. Touch this file after uploading:
```bash
# Touch via SSH or SFTP
touch /home/u238610321/domains/jamhawi.com/nodejs/tmp/restart.txt
```

---

## 🔒 4. Server Configuration Safeguards

The production server uses a patched `server/start.js` which performs two critical safeguards:
1. **Force Environment Override:** It parses `/server/.env` and loads it directly into `process.env` to override any stale variables set in cPanel (such as `DATABASE_URL` pointing to `localhost`).
2. **Direct Entry Execution:** It bypasses spawning any sub-processes and boots `dist/index.js` instantly to stay well within the Hostinger shared process limits.
