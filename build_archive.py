import zipfile
import os
import subprocess
import re

SRC = os.path.abspath(os.path.dirname(__file__))
OUT = os.path.join(SRC, "jamhawi_deploy.zip")

print(f"Starting archive build...")
print(f"Source directory: {SRC}")
print(f"Output file: {OUT}")

# Run git ls-files to get tracked files
try:
    result = subprocess.run(["git", "ls-files"], cwd=SRC, capture_output=True, text=True, check=True)
    tracked_files = result.stdout.splitlines()
except Exception as e:
    print(f"Error running git ls-files: {e}")
    # Fallback to manual walk if git is not available
    tracked_files = []
    for root, dirs, files in os.walk(SRC):
        # Skip node_modules, .git, etc.
        if any(ignored in root for ignored in ["node_modules", ".git", "dist", "server/dist", "server/node_modules"]):
            continue
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), SRC).replace(os.sep, "/")
            tracked_files.append(rel_path)

# Filter files
exclude_regex = re.compile(
    r"^(official logog/|futuredesign/|server/uploads/|node_modules/|dist/|server/dist/|server/node_modules/|build_archive\.py|\.git/)|"
    r"\.mp4$|"
    r"^(server/)?\.env$|"
    r"^majalla\.ttf$|"
    r"\.zip$" # Exclude any zip files (including our output if it exists)
)

filtered_files = []
for f in tracked_files:
    if exclude_regex.search(f):
        continue
    filtered_files.append(f)

# Add required untracked files
untracked_required = [
    ".env.production",
    "server/start.js",
    "server.js"
]

for f in untracked_required:
    if f not in filtered_files and os.path.exists(os.path.join(SRC, f)):
        filtered_files.append(f)

# Write to zip
print(f"Packing {len(filtered_files)} files...")
with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for rel in filtered_files:
        abs_path = os.path.join(SRC, rel.replace("/", os.sep))
        if os.path.isfile(abs_path):
            zf.write(abs_path, rel)
        else:
            print(f"Warning: File not found: {abs_path}")

size_mb = os.path.getsize(OUT) / 1e6
print(f"Archive created successfully: {OUT} ({size_mb:.2f} MB)")
assert size_mb < 50, "Archive exceeds Hostinger's 50 MB limit!"
