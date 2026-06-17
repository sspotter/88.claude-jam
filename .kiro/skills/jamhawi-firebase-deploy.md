# Jamhawi Firebase Deploy

This skill documents how to submit Firebase backend updates for the Jamhawi React e-commerce project — especially **Firestore security rules** and **Storage rules**.

**Always reference this skill before deploying `firestore.rules`, `storage.rules`, or any Firebase config change.**

---

## Firebase CLI (Windows)

**Always use the full path to the standalone binary — do not assume `firebase` is on PATH:**

```
c:\Users\mazen\Downloads\firebase-tools-instant-win.exe
```

In PowerShell, assign it once per session:

```powershell
$firebase = "c:\Users\mazen\Downloads\firebase-tools-instant-win.exe"
```

All commands below use `& $firebase` (or the full path directly).

Verify CLI and login:

```powershell
& $firebase --version
& $firebase login:list
```

Expected login: `tony.m.arks1989xx@gmail.com`

---

## Project Identity

| Setting | Value |
|---|---|
| Firebase project ID | `gen-lang-client-0858272451` |
| Firestore database ID | `ai-studio-d12a3ae1-e4fb-4093-9a99-f8639d1a11c2` |
| Default admin account | `tony.m.arks1989xx@gmail.com` |
| Repo root | `e:\mangingproject\jamhawyy\react-example` |
| Config file | `firebase.json` |
| Project alias file | `.firebaserc` |
| App config fallback | `firebase-applet-config.json` |

The app uses a **named Firestore database** (not the default `(default)` database). `firebase.json` already points rules at the correct database.

---

## Deploy Firestore Rules (primary command)

**This is the standard way to run Firestore deploys on this machine:**

```powershell
cd e:\mangingproject\jamhawyy\react-example

c:\Users\mazen\Downloads\firebase-tools-instant-win.exe deploy --only firestore:rules --project gen-lang-client-0858272451 --config "e:\mangingproject\jamhawyy\react-example\firebase.json"
```

Shorter form (works when `.firebaserc` is present and cwd is repo root):

```powershell
cd e:\mangingproject\jamhawyy\react-example

c:\Users\mazen\Downloads\firebase-tools-instant-win.exe deploy --only firestore:rules
```

Expected success output:

```
=== Deploying to 'gen-lang-client-0858272451'...
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
```

---

## Other Deploy Commands

```powershell
$firebase = "c:\Users\mazen\Downloads\firebase-tools-instant-win.exe"
$project  = "gen-lang-client-0858272451"
$root     = "e:\mangingproject\jamhawyy\react-example"

cd $root

# Set active project (one-time per machine)
& $firebase use $project

# Deploy Firestore rules (most common)
& $firebase deploy --only firestore:rules --project $project

# Deploy Storage rules
& $firebase deploy --only storage --project $project

# Deploy both
& $firebase deploy --only firestore:rules,storage --project $project

# List accessible projects
& $firebase projects:list
```

---

## What Gets Deployed

| File | Target | When to deploy |
|---|---|---|
| `firestore.rules` | Firestore security rules | New collections, changed validation, permission fixes |
| `storage.rules` | Cloud Storage security rules | Image upload path or size changes |
| `firebase.json` | Deploy routing config | Only when deploy targets change |

**This project does not use Firebase Hosting** — the React app runs on Vite (`npm run dev` / separate hosting). Firebase deploy here means **rules only**, not the frontend build.

---

## Standard Deploy Workflow

```
Deploy Progress:
- [ ] Step 1: Edit rules locally (firestore.rules / storage.rules)
- [ ] Step 2: Deploy from repo root using firebase-tools-instant-win.exe
- [ ] Step 3: Confirm "Deploy complete!" in terminal
- [ ] Step 4: Smoke-test in the app
```

### Step 1 — Edit rules

**Firestore rules file:** `firestore.rules`

Current collections with explicit rules:

- `products`, `categories`, `orders`, `offers`, `settings`, `admins`
- `currency_rates` — exchange rate cache (multi-currency pricing)
- `product_prices` — per-product manual prices (multi-currency pricing)

**When adding a new Firestore collection**, you MUST:

1. Add a `match /collection_name/{docId}` block in `firestore.rules`
2. Add validation helper functions if writes are restricted
3. Deploy rules before testing the feature in the app

Without a rule block, the catch-all deny rule blocks all access:

```javascript
match /{document=**} {
  allow read, write: if false;
}
```

---

## Post-Deploy Smoke Tests

### Firestore rules (multi-currency / admin)

1. Log in as admin (`123@123.com` or `tony.m.arks1989xx@gmail.com`)
2. Open `/admin/pricing`
3. Click **Refresh Rates** → should succeed (writes `currency_rates`)
4. Select a product → prices load (reads `product_prices`)
5. Save pricing → should persist

### Firestore rules (storefront)

1. Open `/shop/products` without logging in
2. Switch currency in navbar → prices render (reads `currency_rates`, `product_prices`)
3. Add to cart → checkout → order saves (writes `orders`)

---

## Common Errors

### "No currently active project"

**Cause:** CLI doesn't know which Firebase project to target.

**Fix:** Always pass `--project gen-lang-client-0858272451` or run from repo root where `.firebaserc` exists:

```powershell
c:\Users\mazen\Downloads\firebase-tools-instant-win.exe deploy --only firestore:rules --project gen-lang-client-0858272451 --config "e:\mangingproject\jamhawyy\react-example\firebase.json"
```

---

### "Missing or insufficient permissions" (in browser console)

**Cause:** Rules not deployed, or collection missing from `firestore.rules`.

**Fix:**

1. Confirm the collection has a `match` block in `firestore.rules`
2. Redeploy using the Firestore command above
3. Hard-refresh the app

---

### Rules compile error on deploy

**Cause:** Syntax error in `firestore.rules`.

**Fix:** Read the CLI error line number, fix the rule, redeploy.

---

## Agent Instructions

When deploying Firebase on this project:

1. **Always use** `c:\Users\mazen\Downloads\firebase-tools-instant-win.exe` — never bare `firebase`
2. **Always run from** `e:\mangingproject\jamhawyy\react-example`
3. **Always pass** `--project gen-lang-client-0858272451` if `.firebaserc` may be missing
4. **Read and edit** `firestore.rules` before deploying
5. **Report** deploy output — project ID and "Deploy complete!"

Do not deploy secrets, `.env` files, or frontend build artifacts. Firebase deploy scope here is **security rules only**.
