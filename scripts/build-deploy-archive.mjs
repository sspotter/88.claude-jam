/**
 * build-deploy-archive.mjs
 *
 * Builds a versioned deployment archive for Hostinger (see
 * DEPLOYMENT_HOSTINGER.md) at releases/jamhawi_deploy_vX.Y.Z.zip.
 *
 * File selection:
 *  1. `git ls-files` (auto-respects .gitignore), minus known-bad entries:
 *     official logog/, futuredesign/, server/uploads/, majalla.ttf, any
 *     .env* file, and any *.zip (so a previous release archive never gets
 *     bundled inside the next one).
 *  2. Every file currently sitting in public/, whether or not it's been
 *     `git add`ed. public/ is served as-is by Vite, so anything there must
 *     ship regardless of git tracking status — this is what a plain
 *     `git ls-files` missed for video3.mp4 on 2026-07-08 (untracked, so
 *     silently absent from the archive; the server had been serving the
 *     SPA fallback page for that URL instead of the actual video).
 *  3. .env.production explicitly — required at runtime, but intentionally
 *     gitignored (`.env*`) so it never shows up via git ls-files.
 *
 * Version handling: reads/writes the root package.json "version" field.
 *   node scripts/build-deploy-archive.mjs                 # bump patch (default)
 *   node scripts/build-deploy-archive.mjs --minor          # bump minor
 *   node scripts/build-deploy-archive.mjs --major          # bump major
 *   node scripts/build-deploy-archive.mjs --version=1.4.0  # set explicit version
 *   node scripts/build-deploy-archive.mjs --no-bump         # reuse current version as-is
 *
 * Run: node scripts/build-deploy-archive.mjs
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { ZipArchive } from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const EXCLUDE_DIR_PREFIXES = ["official logog/", "futuredesign/", "server/uploads/"];
const EXCLUDE_EXACT = new Set(["majalla.ttf"]);
const EXCLUDE_PATTERNS = [/\.zip$/i, /(^|\/)\.env(\..+)?$/i];

const MAX_ARCHIVE_MB = 50;

function isExcluded(relPath) {
  if (EXCLUDE_EXACT.has(relPath)) return true;
  if (EXCLUDE_DIR_PREFIXES.some((p) => relPath.startsWith(p))) return true;
  if (EXCLUDE_PATTERNS.some((re) => re.test(relPath))) return true;
  return false;
}

function walkDir(absDir, baseDir, out) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const abs = path.join(absDir, entry.name);
    const rel = path.relative(baseDir, abs).split(path.sep).join("/");
    if (entry.isDirectory()) {
      walkDir(abs, baseDir, out);
    } else {
      out.push(rel);
    }
  }
}

// ─── 1. Version ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { bump: "patch" };
  for (const arg of argv) {
    if (arg === "--minor") args.bump = "minor";
    else if (arg === "--major") args.bump = "major";
    else if (arg === "--no-bump") args.bump = "none";
    else if (arg.startsWith("--version=")) args.version = arg.slice("--version=".length);
  }
  return args;
}

function bumpVersion(current, kind) {
  const parts = current.split(".").map((n) => parseInt(n, 10) || 0);
  let [major, minor, patch] = parts;
  if (kind === "major") { major += 1; minor = 0; patch = 0; }
  else if (kind === "minor") { minor += 1; patch = 0; }
  else if (kind === "patch") { patch += 1; }
  return `${major}.${minor}.${patch}`;
}

const args = parseArgs(process.argv.slice(2));
const pkgPath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

let version;
if (args.version) {
  version = args.version;
} else if (args.bump === "none") {
  version = pkg.version;
} else {
  version = bumpVersion(pkg.version, args.bump);
}

if (version !== pkg.version) {
  const previous = pkg.version;
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log(`Version bumped: ${previous} -> ${version} (written to package.json)`);
} else {
  console.log(`Version: ${version} (unchanged)`);
}

// ─── 2. File list ───────────────────────────────────────────────────────────

// -z: NUL-separated, unquoted — otherwise git escapes filenames containing
// non-ASCII bytes (e.g. em-dashes) as quoted octal strings like
// "official logog/Scene_4_\342\200\224_...jpeg", which would silently defeat
// the directory-prefix exclusion check below.
const tracked = execSync("git ls-files -z", { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .map((l) => l.trim())
  .filter(Boolean)
  .filter((rel) => !isExcluded(rel));

const fileSet = new Set(tracked);

const publicDir = path.join(ROOT, "public");
if (fs.existsSync(publicDir)) {
  const publicFiles = [];
  walkDir(publicDir, ROOT, publicFiles);
  for (const rel of publicFiles) fileSet.add(rel);
}

const envProdPath = path.join(ROOT, ".env.production");
if (fs.existsSync(envProdPath)) {
  fileSet.add(".env.production");
} else {
  console.warn("WARNING: .env.production not found — production build will fall back to relative API paths only if VITE_API_URL isn't otherwise set.");
}

const files = [...fileSet].sort();

// ─── 3. Build the zip ───────────────────────────────────────────────────────

const releasesDir = path.join(ROOT, "releases");
fs.mkdirSync(releasesDir, { recursive: true });
const outPath = path.join(releasesDir, `jamhawi_deploy_v${version}.zip`);

const output = fs.createWriteStream(outPath);
const archive = new ZipArchive({ zlib: { level: 6 } });

let written = 0;

output.on("close", () => {
  const sizeMB = archive.pointer() / 1e6;
  console.log(`Archive: ${outPath}`);
  console.log(`Files:   ${written}`);
  console.log(`Size:    ${sizeMB.toFixed(1)} MB`);
  if (sizeMB >= MAX_ARCHIVE_MB) {
    console.error(`ERROR: archive exceeds Hostinger's ${MAX_ARCHIVE_MB} MB limit.`);
    process.exit(1);
  }
});

archive.on("warning", (err) => { throw err; });
archive.on("error", (err) => { throw err; });
archive.pipe(output);

let missing = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) {
    archive.file(abs, { name: rel });
    written++;
  } else {
    missing++;
  }
}
if (missing > 0) {
  console.warn(`WARNING: ${missing} file(s) listed by git are missing on disk — skipped.`);
}

await archive.finalize();
