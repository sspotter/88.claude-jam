/**
 * detect-missing-i18n.mjs
 *
 * Scans all .tsx/.ts files under src/ and finds hardcoded English strings
 * that are NOT already wrapped in t("...") calls.
 *
 * Outputs:
 *  1. A list of detected strings grouped by file
 *  2. Suggested new translation keys to add to i18n.ts
 *  3. A ready-to-paste JSON block for both "en" and "ar" (ar values left blank for you to fill)
 *
 * Run: node scripts/detect-missing-i18n.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

// ─── Existing keys ────────────────────────────────────────────────────────────
// Pull existing keys directly from i18n.ts by reading the file as text
const i18nPath = path.resolve(SRC_DIR, "i18n.ts");
const i18nText = fs.readFileSync(i18nPath, "utf8");

// Extract all t("key") usages already in source (so we know what's covered)
const existingKeyMatches = [...i18nText.matchAll(/^\s{6}(\w+):/gm)];
const existingKeys = new Set(existingKeyMatches.map((m) => m[1]));

// Also collect existing English values so we can detect duplicates
const enValueMatches = [...i18nText.matchAll(/(\w+):\s*"([^"]+)"/g)];
const existingEnValues = new Map(); // value -> key
// Only grab the en block
const enBlockMatch = i18nText.match(/en:\s*\{[\s\S]*?translation:\s*\{([\s\S]*?)\}\s*\}/);
if (enBlockMatch) {
  const enBlock = enBlockMatch[1];
  const pairs = [...enBlock.matchAll(/(\w+):\s*"([^"]+)"/g)];
  pairs.forEach(([, key, val]) => existingEnValues.set(val.toLowerCase(), key));
}

// ─── File walker ──────────────────────────────────────────────────────────────
function walkDir(dir, exts = [".tsx", ".ts"]) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      files = files.concat(walkDir(full, exts));
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

// ─── Detection patterns ───────────────────────────────────────────────────────
// Matches JSX text content and string props that look like plain English
// Excludes: already-wrapped t("..."), className, style, type, key, id, href, src, placeholder, aria-*, data-*
const SKIP_PROPS = new Set([
  "className","style","type","key","id","href","src","placeholder",
  "aria-label","aria-labelledby","title","alt","name","value","pattern",
  "accept","method","action","rel","target","role","tabIndex","htmlFor",
  "strokeLinecap","strokeLinejoin","strokeWidth","viewBox","fill","stroke",
  "d","cx","cy","r","x","y","width","height","transform","points",
  "xmlns","version","encoding","lang","dir","charset",
]);

// Regex: JSX string literals in props like label="Revenue" or >Revenue<
// We look for:
//   1. JSX text nodes: >SomeEnglishText<  (between tags)
//   2. String props:   prop="SomeEnglishText"
//   3. Template literals and ternaries are skipped (too complex)

const ENGLISH_WORD = /^[A-Z][a-zA-Z0-9 \-\/\(\)\.,'!?:]+$/;  // starts with capital, mostly ASCII

function isEnglishString(str) {
  const s = str.trim();
  if (s.length < 3) return false;
  if (!ENGLISH_WORD.test(s)) return false;
  // Skip things that look like component names, CSS classes, paths
  if (s.includes("/") || s.includes("\\") || s.startsWith("#")) return false;
  // Skip pure numbers
  if (/^\d+$/.test(s)) return false;
  return true;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

// ─── Scan a single file ───────────────────────────────────────────────────────
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const found = new Map(); // string -> line number

  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Skip lines that already use t("...")
    if (/\bt\(["'`]/.test(line)) return;
    // Skip import lines
    if (/^\s*import\s/.test(line)) return;
    // Skip comment lines
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
    // Skip lines with only JSX structure
    if (/^\s*[<>{}]/.test(line) && !/[A-Z]/.test(line)) return;

    // 1. JSX text nodes: >Text content<
    const jsxTextMatches = [...line.matchAll(/>([^<>{}"'`]+)</g)];
    for (const m of jsxTextMatches) {
      const s = m[1].trim();
      if (isEnglishString(s)) {
        found.set(s, lineNum);
      }
    }

    // 2. String prop values: prop="English Text" (skip known non-text props)
    const propMatches = [...line.matchAll(/(\w[\w-]*)=["']([^"']+)["']/g)];
    for (const m of propMatches) {
      const prop = m[1];
      const val = m[2].trim();
      if (SKIP_PROPS.has(prop)) continue;
      if (isEnglishString(val)) {
        found.set(val, lineNum);
      }
    }

    // 3. Standalone string literals in JSX expressions: {"English Text"}
    const exprMatches = [...line.matchAll(/\{["']([^"'{}]+)["']\}/g)];
    for (const m of exprMatches) {
      const s = m[1].trim();
      if (isEnglishString(s)) {
        found.set(s, lineNum);
      }
    }
  });

  return found;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const files = walkDir(SRC_DIR);
const allMissing = new Map(); // string -> { files: Set, key: string }

console.log("\n🔍  Scanning source files for hardcoded English strings...\n");

for (const file of files) {
  const rel = path.relative(SRC_DIR, file);
  const found = scanFile(file);

  if (found.size === 0) continue;

  const newOnes = [];
  for (const [str, line] of found) {
    // Already covered by an existing translation value?
    if (existingEnValues.has(str.toLowerCase())) continue;

    newOnes.push({ str, line });

    if (!allMissing.has(str)) {
      allMissing.set(str, { files: new Set(), key: slugify(str) });
    }
    allMissing.get(str).files.add(`${rel}:${line}`);
  }

  if (newOnes.length > 0) {
    console.log(`📄  ${rel}`);
    for (const { str, line } of newOnes) {
      console.log(`    L${line}  "${str}"`);
    }
    console.log();
  }
}

if (allMissing.size === 0) {
  console.log("✅  No missing translations found!\n");
  process.exit(0);
}

// ─── Deduplicate keys ─────────────────────────────────────────────────────────
// If two strings produce the same slug, append a counter
const usedKeys = new Set([...existingKeys]);
for (const [str, meta] of allMissing) {
  let key = meta.key;
  let counter = 2;
  while (usedKeys.has(key)) {
    key = `${meta.key}_${counter++}`;
  }
  meta.key = key;
  usedKeys.add(key);
}

// ─── Output summary ───────────────────────────────────────────────────────────
console.log("─".repeat(60));
console.log(`\n📊  Found ${allMissing.size} missing translation strings\n`);
console.log("─".repeat(60));

// Build JSON blocks
const enEntries = [];
const arEntries = [];

for (const [str, { key }] of allMissing) {
  enEntries.push(`      ${key}: "${str}"`);
  arEntries.push(`      ${key}: ""  // TODO: translate → "${str}"`);
}

console.log('\n📋  Add these to your i18n.ts  →  en.translation:\n');
console.log("{\n" + enEntries.join(",\n") + "\n}");

console.log('\n📋  Add these to your i18n.ts  →  ar.translation:\n');
console.log("{\n" + arEntries.join(",\n") + "\n}");

// ─── Write output file ────────────────────────────────────────────────────────
const outPath = path.resolve(__dirname, "missing-i18n-keys.json");
const output = {
  summary: `${allMissing.size} missing keys detected`,
  en: Object.fromEntries([...allMissing].map(([str, { key }]) => [key, str])),
  ar: Object.fromEntries([...allMissing].map(([str, { key }]) => [key, ""])),
  locations: Object.fromEntries(
    [...allMissing].map(([str, { key, files }]) => [key, [...files]])
  ),
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n✅  Full report saved to: scripts/missing-i18n-keys.json\n`);
