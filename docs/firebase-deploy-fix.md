# Firebase & Cloudinary — Deployment Fix Reference

> **Date:** 2026-06-05  
> **Project:** gen-lang-client-0858272451  
> **Custom Firestore DB:** `ai-studio-d12a3ae1-e4fb-4093-9a99-f8639d1a11c2`

---

## Problem 1 — Firebase Storage CORS Error

### Symptom
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 
'http://localhost:3006' has been blocked by CORS policy.
```

### Root Cause
The `cors.json` file was correctly configured but had **not been applied** to the Firebase Storage bucket (e.g. after a bucket reset or Google Cloud session expiry).

### Fix
```bash
gsutil cors set cors.json gs://gen-lang-client-0858272451.firebasestorage.app
# Verify:
gsutil cors get gs://gen-lang-client-0858272451.firebasestorage.app
```

> The `cors.json` lives at the project root and already includes `localhost:3006`, `localhost:5173`, `https://aljamhawi.com`.

---

## Problem 2 — Migrated Image Uploads to Cloudinary

### Why
Firebase Storage CORS kept breaking. Cloudinary is simpler, has no CORS issues, and uses unsigned uploads directly from the browser.

### How (Frontend-only, no SDK needed)
```ts
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dy8n4jopb";
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "Radwan";

const formData = new FormData();
formData.append("file", file);
formData.append("upload_preset", uploadPreset);

const response = await fetch(
  `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  { method: "POST", body: formData }
);
const data = await response.json();
const imageUrl = data.secure_url; // Save this to Firestore
```

### Files Changed
- `src/pages/admin/Products.tsx` — `handleImageUpload()`
- `src/pages/admin/Categories.tsx` — `handleImageUpload()`

### Environment Variables (`.env`)
```ini
VITE_CLOUDINARY_CLOUD_NAME="dy8n4jopb"
VITE_CLOUDINARY_UPLOAD_PRESET="Radwan"
```

### Cloudinary Dashboard Requirement
The upload preset **`Radwan`** must be set to **Unsigned** mode:
> Cloudinary Console → Settings → Upload → Upload Presets → Edit `Radwan` → Set Signing Mode to **Unsigned**

---

## Problem 3 — Firestore Write Permission Denied

### Symptom
```
Firestore Error: {"error":"Missing or insufficient permissions.","email":"123@123.com","operationType":"write","path":"categories"}
```

### Root Cause
The **deployed** Firestore security rules on Firebase were **outdated** — they didn't match the local `firestore.rules` file. The `123@123.com` admin was allowed in the local rules but not in the live ones.

### Fix — Deploy Firestore Rules via CLI

**1. Install Firebase CLI (once):**
```bash
npm install -g firebase-tools
```

**2. Login:**
```bash
firebase login
```

**3. Create `firebase.json` at project root (already done):**
```json
{
  "firestore": [
    {
      "database": "ai-studio-d12a3ae1-e4fb-4093-9a99-f8639d1a11c2",
      "rules": "firestore.rules"
    }
  ]
}
```

> ⚠️ The `database` key is **required** because this project uses a non-default custom Firestore database.  
> Without it, Firebase CLI tries to create a new `(default)` database and fails with a billing error.

**4. Deploy rules (run from any directory):**
```bash
firebase deploy --only firestore:rules --project gen-lang-client-0858272451 --config "e:\mangingproject\jamhawyy\react-example\firebase.json"
```

### Expected Output
```
+  cloud.firestore: rules file firestore.rules compiled successfully
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
```

---

## Quick Reference — Whenever Rules Change

Anytime you edit `firestore.rules` or `storage.rules`, re-deploy:

```bash
# Firestore rules only
firebase deploy --only firestore:rules --project gen-lang-client-0858272451 --config "e:\mangingproject\jamhawyy\react-example\firebase.json"

# Storage rules only (needs gsutil)
gsutil cors set cors.json gs://gen-lang-client-0858272451.firebasestorage.app
```
