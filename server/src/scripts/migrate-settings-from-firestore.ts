import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, type Firestore } from "firebase/firestore";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

dotenv.config();

/**
 * One-time settings migration: Firestore -> PostgreSQL (Setting table).
 *
 * The original storefront kept three pieces of configuration in Firestore that
 * the primary `migrate-from-firestore.ts` script does NOT cover:
 *
 *   - `settings/theme`            -> Setting { id: "theme" }
 *   - `currency_rates/*`          -> Setting { id: "currency_rates" }
 *   - `product_prices/*`          -> Setting { id: "product_prices" }
 *
 * Unlike orders (admin-gated), these collections are public-read per
 * `firestore.rules` (`allow read: if true`), so this script uses the public
 * Firebase **web** SDK config rather than service-account credentials.
 *
 * The Firestore documents use snake_case field names; the REST API and the
 * frontend pricing services expect camelCase, so we remap on the way in to
 * match the shapes in:
 *   - server/src/routes/catalog.routes.ts  (GET /api/pricing/rates, /product-prices, /settings/theme)
 *   - src/lib/pricing/currencyService.ts   (RatesPayload)
 *   - src/lib/pricing/productPriceService.ts (PriceRow)
 *
 * Idempotent: upserts the three Setting rows by id, so re-running is safe and
 * always reflects the current Firestore state.
 *
 * Usage:  npm run migrate-settings-from-firestore
 */

// Public web config (already committed in firebase-applet-config.json and the
// frontend test script). Overridable via env for porting to another project.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_WEB_API_KEY || "AIzaSyBXLcInYS4e9WACcMT9YimTo7GPF_b8yR8",
  authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN || "gen-lang-client-0858272451.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0858272451",
  storageBucket: process.env.FIREBASE_WEB_STORAGE_BUCKET || "gen-lang-client-0858272451.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID || "683279362409",
  appId: process.env.FIREBASE_WEB_APP_ID || "1:683279362409:web:cc37458f6629bf6639b5f8",
};

// The store uses a NAMED Firestore database, not "(default)".
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || "ai-studio-d12a3ae1-e4fb-4093-9a99-f8639d1a11c2";

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

interface RateRow {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  provider: string;
  syncedAt: number;
  createdAt: number;
  updatedAt: number;
}

interface SyncMeta {
  lastSyncAt: number | null;
  provider: string | null;
  status: string | null;
}

interface PriceRow {
  productId: string;
  currencyCode: string;
  price: number;
  isManual: boolean;
  createdAt: number;
  updatedAt: number;
}

async function migrate() {
  const app = initializeApp(firebaseConfig);
  const db: Firestore = getFirestore(app, FIRESTORE_DATABASE_ID);
  console.log("[settings] Connected to Firestore. Migrating settings...\n");

  // 1. Theme -> Setting { id: "theme", value: { selectedTheme } }
  let themeWritten = 0;
  const themeSnap = await getDocs(collection(db, "settings"));
  const themeDoc = themeSnap.docs.find((d) => d.id === "theme");
  if (themeDoc) {
    const data = themeDoc.data() as { selectedTheme?: string };
    await prisma.setting.upsert({
      where: { id: "theme" },
      update: { value: { selectedTheme: data.selectedTheme ?? null } },
      create: { id: "theme", value: { selectedTheme: data.selectedTheme ?? null } },
    });
    themeWritten = 1;
  }
  console.log(`[settings] theme: ${themeWritten ? `selectedTheme=${(themeDoc!.data() as any).selectedTheme}` : "(none found)"}`);

  // 2. Currency rates -> Setting { id: "currency_rates", value: { rates[], syncMeta } }
  const ratesSnap = await getDocs(collection(db, "currency_rates"));
  const rates: RateRow[] = [];
  let syncMeta: SyncMeta = { lastSyncAt: null, provider: null, status: null };
  for (const d of ratesSnap.docs) {
    const r = d.data() as Record<string, unknown>;
    if (d.id === "_sync_meta") {
      syncMeta = {
        lastSyncAt: r.last_sync_at != null ? num(r.last_sync_at) : null,
        provider: (r.provider as string | undefined) ?? null,
        status: (r.status as string | undefined) ?? null,
      };
      continue;
    }
    rates.push({
      baseCurrency: String(r.base_currency ?? ""),
      targetCurrency: String(r.target_currency ?? ""),
      rate: num(r.rate),
      provider: String(r.provider ?? ""),
      syncedAt: num(r.synced_at),
      createdAt: num(r.created_at),
      updatedAt: num(r.updated_at),
    });
  }
  const ratesValue = { rates, syncMeta } as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { id: "currency_rates" },
    update: { value: ratesValue },
    create: { id: "currency_rates", value: ratesValue },
  });
  console.log(`[settings] currency_rates: ${rates.length} rate(s), syncMeta.status=${syncMeta.status}`);

  // 3. Product prices -> Setting { id: "product_prices", value: { prices[] } }
  const pricesSnap = await getDocs(collection(db, "product_prices"));
  const prices: PriceRow[] = pricesSnap.docs.map((d) => {
    const p = d.data() as Record<string, unknown>;
    return {
      productId: String(p.product_id ?? ""),
      currencyCode: String(p.currency_code ?? ""),
      price: num(p.price),
      isManual: Boolean(p.is_manual ?? false),
      createdAt: num(p.created_at),
      updatedAt: num(p.updated_at),
    };
  });
  const pricesValue = { prices } as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { id: "product_prices" },
    update: { value: pricesValue },
    create: { id: "product_prices", value: pricesValue },
  });
  console.log(`[settings] product_prices: ${prices.length} price row(s)`);

  console.log("\n🎉 Settings migration complete.");
}

migrate()
  .catch((err) => {
    console.error("Settings migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
