/**
 * Test: getVisibleCategories
 *
 * Run with:  npx tsx src/tests/categories.test.ts
 *
 * No test runner required — uses Node's built-in assert module via tsx.
 */

import assert from "node:assert/strict";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  image?: string;
  createdAt: number;
  isHidden?: boolean;
}

// ─── Function under test ─────────────────────────────────────────────────────

/**
 * Returns only categories that are not hidden.
 * A category is visible when isHidden is false, undefined, or null.
 */
function getVisibleCategories(categories: Category[]): Category[] {
  return categories.filter((cat) => !cat.isHidden);
}

// ─── Test data ───────────────────────────────────────────────────────────────

const mockCategories: Category[] = [
  { id: "1", name: "Perfumes",    nameAr: "عطور",   createdAt: 1000, isHidden: false },
  { id: "2", name: "Oud",         nameAr: "عود",    createdAt: 2000, isHidden: true  },
  { id: "3", name: "Body Mists",  nameAr: "بخاخات", createdAt: 3000, isHidden: false },
  { id: "4", name: "Accessories",                   createdAt: 4000                  }, // no isHidden field
  { id: "5", name: "Hidden Item",                   createdAt: 5000, isHidden: true  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log("\ngetVisibleCategories()\n");

test("returns only non-hidden categories", () => {
  const result = getVisibleCategories(mockCategories);
  assert.equal(result.length, 3, `expected 3 visible, got ${result.length}`);
});

test("does not include categories where isHidden is true", () => {
  const result = getVisibleCategories(mockCategories);
  const hiddenInResult = result.filter((c) => c.isHidden === true);
  assert.equal(hiddenInResult.length, 0, "hidden categories leaked into result");
});

test("includes categories where isHidden is false", () => {
  const result = getVisibleCategories(mockCategories);
  assert.ok(result.some((c) => c.id === "1"), 'id=1 (isHidden:false) should be visible');
  assert.ok(result.some((c) => c.id === "3"), 'id=3 (isHidden:false) should be visible');
});

test("includes categories with no isHidden field (treat as visible)", () => {
  const result = getVisibleCategories(mockCategories);
  assert.ok(result.some((c) => c.id === "4"), 'id=4 (no isHidden) should be visible');
});

test("excludes id=2 (isHidden:true)", () => {
  const result = getVisibleCategories(mockCategories);
  assert.ok(!result.some((c) => c.id === "2"), 'id=2 should be hidden');
});

test("excludes id=5 (isHidden:true)", () => {
  const result = getVisibleCategories(mockCategories);
  assert.ok(!result.some((c) => c.id === "5"), 'id=5 should be hidden');
});

test("returns empty array when all categories are hidden", () => {
  const allHidden: Category[] = [
    { id: "a", name: "X", createdAt: 1, isHidden: true },
    { id: "b", name: "Y", createdAt: 2, isHidden: true },
  ];
  const result = getVisibleCategories(allHidden);
  assert.equal(result.length, 0);
});

test("returns all categories when none are hidden", () => {
  const noneHidden: Category[] = [
    { id: "a", name: "X", createdAt: 1, isHidden: false },
    { id: "b", name: "Y", createdAt: 2 },
  ];
  const result = getVisibleCategories(noneHidden);
  assert.equal(result.length, 2);
});

test("returns empty array for empty input", () => {
  const result = getVisibleCategories([]);
  assert.equal(result.length, 0);
});

test("preserves category data in returned objects", () => {
  const result = getVisibleCategories(mockCategories);
  const perfumes = result.find((c) => c.id === "1");
  assert.ok(perfumes, "category not found");
  assert.equal(perfumes!.name, "Perfumes");
  assert.equal(perfumes!.nameAr, "عطور");
  assert.equal(perfumes!.createdAt, 1000);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
