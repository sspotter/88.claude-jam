// Local/dev database bootstrap. Runs automatically before `npm run dev`
// (wired via the server's `predev` script) so the project initializes itself.
//
// What it does, idempotently:
//   1. Syncs the schema with `prisma db push` (also creates the target DB if missing).
//   2. Seeds the admin (idempotent upsert).
//
// Why `db push` and not `migrate deploy`: the committed migrations under
// prisma/migrations are the legacy PostgreSQL set (migration_lock.toml still
// says `postgresql`), while schema.prisma targets MySQL. `db push` syncs the
// live schema directly from schema.prisma, which is how the MySQL deployments
// are provisioned. This script is environment-agnostic: it reads DATABASE_URL,
// so a different deployment simply points DATABASE_URL at its own MySQL.

import { execSync } from "node:child_process";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[init-db] DATABASE_URL is not set in server/.env — cannot initialize the database.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("[init-db] DATABASE_URL is not a valid URL.");
  process.exit(1);
}

if (parsed.protocol !== "mysql:") {
  console.error(
    `[init-db] Expected a mysql:// URL but DATABASE_URL uses "${parsed.protocol.replace(":", "")}". ` +
      "The Prisma schema provider is `mysql` — update server/.env to a mysql:// URL."
  );
  process.exit(1);
}

const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!dbName) {
  console.error("[init-db] DATABASE_URL must include a database name, e.g. mysql://root:pwd@127.0.0.1:3306/jamhawi_dev");
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit", shell: true });

try {
  console.log(`[init-db] Syncing schema for "${dbName}" (prisma db push)…`);
  run("npx prisma db push --skip-generate");
} catch (err) {
  console.error("[init-db] Database initialization failed. Check DATABASE_URL / that MySQL is running.");
  process.exit(1);
}

// Seeding is best-effort: a missing SEED_ADMIN_* should not block the dev server.
try {
  console.log("[init-db] Seeding admin (idempotent)...");
  run("npm run seed-admin");
} catch {
  console.warn(
    "[init-db] Admin seed skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in server/.env to enable). Continuing."
  );
}

console.log(`[init-db] Ready — database "${dbName}" is in sync.`);
