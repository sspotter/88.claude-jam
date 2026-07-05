# Deployment Runbook — aljamhawi.com

Follow this path **every time** you push changes you want live. It takes the
code from your machine → GitHub → the Hostinger VPS, and verifies the site is
actually serving the new build over HTTPS.

> TL;DR: **merge to `main` → push → SSH to the VPS → `git pull` → build backend
> + frontend → `pm2 restart` → verify.** Use the one-shot script in
> [§4](#4-deploy-on-the-vps-one-shot) if you just want it done.

---

## 0. Production topology (what you're deploying to)

| Thing | Value |
|---|---|
| Domain | `https://aljamhawi.com` (+ `www`), Let's Encrypt TLS, auto-renew |
| VPS | `jamhawi@187.127.73.56` — Ubuntu, SSH **key** auth (`~/.ssh/id_rsa`), passwordless sudo |
| App dir | `/var/www/jamhawi` (git clone of `github.com/sspotter/88.claude-jam`, branch `main`) |
| Frontend | built to `/var/www/jamhawi/dist`, served by **nginx** |
| Backend | Express/Prisma on `:5000`, run by **pm2** as `jamhawi-api` (systemd `pm2-jamhawi`, boot-persistent) |
| Database | PostgreSQL 17, db `jamhawi_prod`, role `jamhawi_app` |
| Web server | nginx: static SPA + reverse-proxy `/api`, `/uploads`, `/health` → `:5000` |
| Secrets | `/var/www/jamhawi/server/.env` and `/var/www/jamhawi/.env` — **on the VPS only, NOT in git** |

**Key design note:** the frontend is built with `VITE_API_URL=/` so all API
calls are **same-origin relative** (`/api/...`). Don't change this — it's why the
site works over the domain and the bare IP, http or https, with no rebuild.

---

## 1. Before you push (local)

- [ ] Working tree is what you intend: `git status`
- [ ] Type-check passes: `npm run lint` (this is `tsc --noEmit`)
- [ ] Frontend builds clean: `npm run build`
- [ ] Backend builds clean: `npm run server-build`
- [ ] Tests pass (if touched): `npm test` / `npm run server-test`
- [ ] If you changed the Prisma schema, you created a migration:
      `cd server && npx prisma migrate dev --name <change>` and committed it.

## 2. Merge & push

```bash
# from your feature branch, ensure it's committed
git checkout main
git pull origin main
git merge --no-ff <your-branch>      # or --ff-only if linear
git push origin main
git checkout <your-branch>           # back to work branch
```

> The VPS deploys from **`main`**. Nothing is live until it's on `origin/main`
> **and** you run the deploy step below. Pushing alone does not deploy.

## 3. Pre-deploy checks (decide what this push needs)

- [ ] **DB migration?** If `server/prisma/migrations/` changed → migration runs in §4.
- [ ] **New env var?** Add it to `/var/www/jamhawi/server/.env` (or root `.env` for
      `VITE_*`) **before** building, then it takes effect on restart. Env is not in git.
- [ ] **nginx change?** Only then do you need `sudo systemctl reload nginx`.
- [ ] **New dependency?** `npm ci` in §4 installs it.

## 4. Deploy on the VPS (one-shot)

```bash
ssh jamhawi@187.127.73.56 'bash -s' <<'EOF'
set -e
cd /var/www/jamhawi
echo "== pull =="
git fetch origin && git reset --hard origin/main   # discards local edits on the VPS clone

echo "== backend: deps, migrate, build =="
cd server
npm ci
npx prisma migrate deploy          # safe no-op if no new migrations
npm run build                       # prisma generate + tsc
cd ..

echo "== frontend: deps, build =="
npm ci
npm run build                       # uses VITE_API_URL=/ from /var/www/jamhawi/.env

echo "== restart API =="
pm2 restart jamhawi-api --update-env
pm2 save

echo "== DONE =="
EOF
```

> `git reset --hard origin/main` keeps the VPS clone clean. It does **not** touch
> `.env` files or `server/uploads/` (those are gitignored / untracked).
> If you changed nginx config, also run: `ssh jamhawi@187.127.73.56 "sudo nginx -t && sudo systemctl reload nginx"`.

## 5. Verify (must all pass)

```bash
# Force-resolve to the VPS so you test THIS box, not a cached/old IP.
R="--resolve aljamhawi.com:443:187.127.73.56"
curl -s $R -o /dev/null -w "home   -> %{http_code}\n" https://aljamhawi.com/
curl -s $R https://aljamhawi.com/health ; echo
curl -s $R https://aljamhawi.com/api/products | head -c 120 ; echo
curl -s $R -X POST https://aljamhawi.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@jamhawi.com","password":"<admin-pw>"}' \
  -o /dev/null -w "login  -> %{http_code}\n"
```

- [ ] home → `200`
- [ ] `/health` → `{"status":"healthy",...}`
- [ ] `/api/products` → JSON (not an nginx/HTML error)
- [ ] admin login → `200`
- [ ] In a browser: hard-refresh `https://aljamhawi.com` and click through a real flow.
- [ ] `pm2 status` shows `jamhawi-api` **online** with a fresh uptime and low restart count.
- [ ] No new errors: `pm2 logs jamhawi-api --lines 50 --nostream`

## 6. Rollback (if §5 fails)

```bash
ssh jamhawi@187.127.73.56 'bash -s' <<'EOF'
set -e
cd /var/www/jamhawi
git reset --hard HEAD~1            # or: git reset --hard <last-good-sha>
cd server && npm ci && npm run build && cd ..
npm ci && npm run build
pm2 restart jamhawi-api
EOF
```

> A schema migration is **not** auto-reverted by a git rollback. If a bad
> migration shipped, restore from a DB backup or write a corrective migration.
> Take a dump before risky migrations:
> `ssh jamhawi@187.127.73.56 "pg_dump -U jamhawi_app -h localhost jamhawi_prod > ~/jamhawi_$(date +%F).sql"`

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `npm ci` fails `EINTEGRITY` on **tapable@2.3.3** | The committed `package-lock.json` had a wrong integrity hash. Fix in repo (regenerate lockfile) or on VPS: `rm package-lock.json && npm install`. |
| 502 Bad Gateway | Backend down. `pm2 restart jamhawi-api`; check `pm2 logs jamhawi-api`. |
| API 404 / HTML where JSON expected | nginx not proxying — confirm `/etc/nginx/sites-enabled/jamhawi` has the `/api/` block; `sudo nginx -t && sudo systemctl reload nginx`. |
| Frontend shows old version | Browser/asset cache. Vite hashes asset filenames; hard-refresh. Confirm `dist/` rebuilt (check file mtimes). |
| DB connection errors | Check `DATABASE_URL` in `server/.env`; `systemctl status postgresql`. |
| TLS cert | Renews automatically. Manual: `sudo certbot renew`; test: `sudo certbot renew --dry-run`. |
| DNS / domain (Hostinger) | Records managed via Hostinger DNS (API or MCP after a Claude Code restart). Apex `A → 187.127.73.56`, `AAAA → 2a02:4780:79:e6be::1`. |

## First-time / server setup (already done — for reference only)

nginx, certbot, pm2 installed; PostgreSQL `jamhawi_prod`/`jamhawi_app` created;
Prisma migrated; admin seeded; pm2 `startup` + `save`; ufw allows 22/80/443;
Let's Encrypt issued via `certbot --nginx -d aljamhawi.com -d www.aljamhawi.com`.
