/**
 * Fetches visible (non-hidden) categories directly from Firestore.
 *
 * Run:  npx tsx src/tests/fetch-visible-categories.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs } from "firebase/firestore";

// ─── Config (mirrors firebase-applet-config.json) ────────────────────────────

const firebaseConfig = {
  apiKey:            "AIzaSyBXLcInYS4e9WACcMT9YimTo7GPF_b8yR8",
  authDomain:        "gen-lang-client-0858272451.firebaseapp.com",
  projectId:         "gen-lang-client-0858272451",
  storageBucket:     "gen-lang-client-0858272451.firebasestorage.app",
  messagingSenderId: "683279362409",
  appId:             "1:683279362409:web:cc37458f6629bf6639b5f8",
};

const FIRESTORE_DATABASE_ID = "ai-studio-d12a3ae1-e4fb-4093-9a99-f8639d1a11c2";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  image?: string;
  createdAt: number;
  isHidden?: boolean;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function fetchVisibleCategories(): Promise<Category[]> {
  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app, FIRESTORE_DATABASE_ID);

  const snapshot = await getDocs(
    query(collection(db, "categories"), orderBy("createdAt", "asc"))
  );

  const all: Category[] = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Category)
  );

  return all.filter((cat) => !cat.isHidden);
}

// ─── Run & print ─────────────────────────────────────────────────────────────

console.log("\nFetching visible categories from Firestore...\n");

fetchVisibleCategories()
  .then((categories) => {
    if (categories.length === 0) {
      console.log("  No visible categories found.\n");
      process.exit(0);
    }

    console.log(`  Found ${categories.length} visible category/categories:\n`);

    categories.forEach((cat, i) => {
      console.log(`  [${i + 1}] ${cat.name}${cat.nameAr ? ` / ${cat.nameAr}` : ""}`);
      console.log(`       id       : ${cat.id}`);
      console.log(`       image    : ${cat.image || "(none)"}`);
      console.log(`       isHidden : ${cat.isHidden ?? false}`);
      console.log(`       createdAt: ${new Date(cat.createdAt).toLocaleString()}`);
      console.log();
    });

    process.exit(0);
  })
  .catch((err) => {
    console.error("  Error fetching categories:", err.message ?? err);
    process.exit(1);
  });
