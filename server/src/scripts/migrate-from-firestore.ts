import dotenv from "dotenv";
import admin from "firebase-admin";
import prisma from "../config/prisma.js";

dotenv.config();

/**
 * One-time data migration: Firestore -> PostgreSQL.
 *
 * Reads every collection from Firestore (using the same credential env vars the
 * old server used) and inserts the rows into Postgres via Prisma, preserving the
 * original document IDs so foreign keys (product.categoryId, order items) stay
 * intact. Order `items[]` arrays are split into OrderItem rows and the nested
 * `coupon` object is flattened into two columns. Numeric ms timestamps become
 * DateTime.
 *
 * Order of insertion respects FKs: categories -> products -> offers -> orders.
 *
 * Usage (with Firestore credentials in server/.env):
 *   npm run migrate-from-firestore
 */

function initFirestore(): FirebaseFirestore.Firestore {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "jamhawi",
    });
    return admin.firestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      ),
    });
    return admin.firestore();
  }

  const pKey = process.env.FIREBASE_PRIVATE_KEY;
  if (pKey && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pKey.replace(/\\n/g, "\n"),
      }),
    });
    return admin.firestore();
  }

  admin.initializeApp();
  return admin.firestore();
}

function toDate(ms: unknown): Date {
  const n = Number(ms);
  return !isNaN(n) && n > 0 ? new Date(n) : new Date();
}

async function migrate() {
  const fs = initFirestore();
  console.log("[migrate] Connected to Firestore. Starting migration...\n");

  // 1. Categories
  const catSnap = await fs.collection("categories").get();
  for (const d of catSnap.docs) {
    const c = d.data();
    await prisma.category.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        name: String(c.name ?? "Unnamed"),
        nameAr: c.nameAr ?? null,
        createdAt: toDate(c.createdAt),
      },
    });
  }
  console.log(`[migrate] categories: ${catSnap.size}`);

  // 2. Products
  const prodSnap = await fs.collection("products").get();
  let productCount = 0;
  for (const d of prodSnap.docs) {
    const p = d.data();
    if (!p.categoryId) {
      console.warn(`  ! product ${d.id} has no categoryId — skipped`);
      continue;
    }
    await prisma.product.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        name: String(p.name ?? "Unnamed"),
        nameAr: p.nameAr ?? null,
        price: Number(p.price) || 0,
        categoryId: String(p.categoryId),
        isAvailable: p.isAvailable ?? true,
        stockCount: p.stockCount != null ? Math.floor(Number(p.stockCount)) : 0,
        image: p.image ?? null,
        description: p.description ?? null,
        createdAt: toDate(p.createdAt),
      },
    });
    productCount++;
  }
  console.log(`[migrate] products: ${productCount}/${prodSnap.size}`);

  // 3. Offers
  const offerSnap = await fs.collection("offers").get();
  for (const d of offerSnap.docs) {
    const o = d.data();
    await prisma.offer.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: String(o.title ?? ""),
        description: o.description ?? null,
        discountPercentage: Number(o.discountPercentage) || 0,
        isActive: o.isActive ?? true,
        createdAt: toDate(o.createdAt),
      },
    });
  }
  console.log(`[migrate] offers: ${offerSnap.size}`);

  // 4. Orders (+ nested items)
  const orderSnap = await fs.collection("orders").get();
  for (const d of orderSnap.docs) {
    const o = d.data();
    const items: any[] = Array.isArray(o.items) ? o.items : [];
    await prisma.order.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        customerName: String(o.customerName ?? ""),
        phone: String(o.phone ?? ""),
        address: String(o.address ?? ""),
        notes: o.notes ?? null,
        totalPrice: Number(o.totalPrice) || 0,
        paymentMethod: String(o.paymentMethod ?? "whatsapp"),
        status: String(o.status ?? "pending"),
        paymentStatus: o.paymentStatus ?? null,
        paymobTransactionId: o.paymobTransactionId ?? null,
        paidAt: o.paidAt ? toDate(o.paidAt) : null,
        failedAt: o.failedAt ? toDate(o.failedAt) : null,
        couponCode: o.coupon?.code ?? null,
        couponDiscountPercentage: o.coupon?.discountPercentage ?? null,
        createdAt: toDate(o.createdAt),
        items: {
          create: items.map((i) => ({
            productId: String(i.productId ?? i.id ?? "unknown"),
            name: String(i.name ?? ""),
            price: Number(i.price) || 0,
            quantity: Math.floor(Number(i.quantity)) || 1,
          })),
        },
      },
    });
  }
  console.log(`[migrate] orders: ${orderSnap.size}`);

  // 5. Settings (theme)
  const settingsSnap = await fs.collection("settings").get();
  for (const d of settingsSnap.docs) {
    await prisma.setting.upsert({
      where: { id: d.id },
      update: { value: d.data() },
      create: { id: d.id, value: d.data() },
    });
  }
  console.log(`[migrate] settings: ${settingsSnap.size}`);

  // 6. Verification — counts must match.
  console.log("\n[migrate] Verifying row counts...");
  const checks: Array<[string, number, number]> = [
    ["categories", catSnap.size, await prisma.category.count()],
    ["offers", offerSnap.size, await prisma.offer.count()],
    ["orders", orderSnap.size, await prisma.order.count()],
    ["settings", settingsSnap.size, await prisma.setting.count()],
  ];
  let ok = true;
  for (const [name, src, dst] of checks) {
    const match = src === dst;
    ok = ok && match;
    console.log(`  ${match ? "✅" : "❌"} ${name}: firestore=${src} postgres=${dst}`);
  }
  console.log(
    `  ${productCount === (await prisma.product.count()) ? "✅" : "⚠️"} products: migrated=${productCount} postgres=${await prisma.product.count()} (firestore=${prodSnap.size})`
  );

  console.log(ok ? "\n🎉 Migration complete." : "\n⚠️  Migration finished with count mismatches — review above.");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
