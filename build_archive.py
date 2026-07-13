"""
build_archive.py

Python counterpart to scripts/build-deploy-archive.mjs (see
DEPLOYMENT_HOSTINGER.md). Builds a versioned deployment archive for
Hostinger at releases/jamhawi_deploy_vX.Y.Z.zip.

File selection:
 1. `git ls-files` (auto-respects .gitignore), minus known-bad entries:
    official logog/, futuredesign/, server/uploads/, majalla.ttf, any
    .env* file, and any *.zip (so a previous release archive never gets
    bundled inside the next one).
 2. Every file currently sitting in public/, whether or not it's been
    `git add`ed. public/ is served as-is by Vite, so anything there must
    ship regardless of git tracking status.
 3. .env.production explicitly - required at runtime, but intentionally
    gitignored (.env*) so it never shows up via git ls-files.

Version handling: reads/writes the root package.json "version" field.
  python build_archive.py                 # bump patch (default)
  python build_archive.py --minor          # bump minor
  python build_archive.py --major          # bump major
  python build_archive.py --version=1.4.0  # set explicit version
  python build_archive.py --no-bump        # reuse current version as-is

Run: python build_archive.py
"""

import json
import os
import re
import subprocess
import sys
import zipfile

SRC = os.path.abspath(os.path.dirname(__file__))
MAX_ARCHIVE_MB = 50

EXCLUDE_DIR_PREFIXES = ("official logog/", "futuredesign/", "server/uploads/")
EXCLUDE_EXACT = {"majalla.ttf"}
EXCLUDE_PATTERNS = [re.compile(r"\.zip$", re.I), re.compile(r"(^|/)\.env(\..+)?$", re.I)]


def is_excluded(rel_path):
    if rel_path in EXCLUDE_EXACT:
        return True
    if any(rel_path.startswith(p) for p in EXCLUDE_DIR_PREFIXES):
        return True
    return any(p.search(rel_path) for p in EXCLUDE_PATTERNS)


def walk_dir(abs_dir, base_dir):
    out = []
    for root, dirs, files in os.walk(abs_dir):
        for name in files:
            if name == ".DS_Store":
                continue
            abs_path = os.path.join(root, name)
            rel = os.path.relpath(abs_path, base_dir).replace(os.sep, "/")
            out.append(rel)
    return out


# ─── 1. Version ──────────────────────────────────────────────────────────

def parse_args(argv):
    args = {"bump": "patch", "version": None}
    for arg in argv:
        if arg == "--minor":
            args["bump"] = "minor"
        elif arg == "--major":
            args["bump"] = "major"
        elif arg == "--no-bump":
            args["bump"] = "none"
        elif arg.startswith("--version="):
            args["version"] = arg.split("=", 1)[1]
    return args


def bump_version(current, kind):
    parts = (current.split(".") + ["0", "0", "0"])[:3]
    major, minor, patch = (int(p) if p.isdigit() else 0 for p in parts)
    if kind == "major":
        major, minor, patch = major + 1, 0, 0
    elif kind == "minor":
        minor, patch = minor + 1, 0
    elif kind == "patch":
        patch += 1
    return f"{major}.{minor}.{patch}"


args = parse_args(sys.argv[1:])
pkg_path = os.path.join(SRC, "package.json")
with open(pkg_path, "r", encoding="utf-8") as f:
    pkg = json.load(f)

if args["version"]:
    version = args["version"]
elif args["bump"] == "none":
    version = pkg["version"]
else:
    version = bump_version(pkg["version"], args["bump"])

if version != pkg["version"]:
    previous = pkg["version"]
    pkg["version"] = version
    with open(pkg_path, "w", encoding="utf-8") as f:
        json.dump(pkg, f, indent=2)
        f.write("\n")
    print(f"Version bumped: {previous} -> {version} (written to package.json)")
else:
    print(f"Version: {version} (unchanged)")

# ─── 2. File list ────────────────────────────────────────────────────────

try:
    result = subprocess.run(
        ["git", "ls-files", "-z"], cwd=SRC, capture_output=True, check=True
    )
    tracked = [p for p in result.stdout.decode("utf-8").split("\0") if p.strip()]
except Exception as e:
    print(f"Error running git ls-files: {e}")
    tracked = walk_dir(SRC, SRC)
    tracked = [p for p in tracked if ".git/" not in p]

file_set = {p for p in tracked if not is_excluded(p)}

public_dir = os.path.join(SRC, "public")
if os.path.isdir(public_dir):
    for rel in walk_dir(public_dir, SRC):
        file_set.add(rel)

env_prod_path = os.path.join(SRC, ".env.production")
if os.path.isfile(env_prod_path):
    file_set.add(".env.production")
else:
    print("WARNING: .env.production not found - production build will fall back to relative API paths only if VITE_API_URL isn't otherwise set.")

files = sorted(file_set)

# ─── 3. Build the zip ────────────────────────────────────────────────────

releases_dir = os.path.join(SRC, "releases")
os.makedirs(releases_dir, exist_ok=True)
out_path = os.path.join(releases_dir, f"jamhawi_deploy_v{version}.zip")

print(f"Packing {len(files)} files...")
written = 0
missing = 0
with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for rel in files:
        abs_path = os.path.join(SRC, rel.replace("/", os.sep))
        if os.path.isfile(abs_path):
            zf.write(abs_path, rel)
            written += 1
        else:
            missing += 1

if missing:
    print(f"WARNING: {missing} file(s) listed by git are missing on disk - skipped.")

size_mb = os.path.getsize(out_path) / 1e6
print(f"Archive: {out_path}")
print(f"Files:   {written}")
print(f"Size:    {size_mb:.1f} MB")
if size_mb >= MAX_ARCHIVE_MB:
    print(f"ERROR: archive exceeds Hostinger's {MAX_ARCHIVE_MB} MB limit.")
    sys.exit(1)
