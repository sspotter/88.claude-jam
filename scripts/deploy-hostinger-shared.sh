#!/usr/bin/env bash
# Deploy to the Hostinger shared-hosting Node.js app (jamhawi.com) over SSH/SCP.
# Requires PuTTY's plink/pscp (Windows) since auth is password-based, not key-based.
#
# Usage:
#   HOSTINGER_SSH_PASSWORD='...' scripts/deploy-hostinger-shared.sh [--skip-build]
#
# --skip-build   Skip `npm run build:archive` and deploy the newest existing
#                releases/jamhawi_deploy_v*.zip instead of building a new one.
set -euo pipefail

HOST="77.37.37.232"
PORT="65002"
SSH_USER="u238610321"
REMOTE_APP_DIR="domains/jamhawi.com/nodejs"
REMOTE_NODE_BIN="/opt/alt/alt-nodejs24/root/usr/bin"
HEALTH_URL="https://jamhawi.com/health"
# Pins the server's host key so plink/pscp trust it non-interactively instead
# of showing the "store key in cache?" prompt (a piped "echo y" can't
# reliably answer it and the connection aborts).
HOSTKEY="SHA256:izq+BXpKyqyV/3+6MdcNif+isM53y0Brir9Src/0mwE"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -z "${HOSTINGER_SSH_PASSWORD:-}" ]]; then
  echo "error: HOSTINGER_SSH_PASSWORD is not set." >&2
  echo "  HOSTINGER_SSH_PASSWORD='...' scripts/deploy-hostinger-shared.sh" >&2
  exit 1
fi

PSCP=$(command -v pscp || echo "/c/Program Files/PuTTY/pscp")
PLINK=$(command -v plink || echo "/c/Program Files/PuTTY/plink")

if [[ "${1:-}" == "--skip-build" ]]; then
  echo "==> Skipping build, using newest existing archive"
else
  echo "==> Building deploy archive (npm run build:archive)"
  npm run build:archive
fi

ARCHIVE=$(ls -t releases/jamhawi_deploy_v*.zip 2>/dev/null | head -1)
if [[ -z "$ARCHIVE" ]]; then
  echo "error: no releases/jamhawi_deploy_v*.zip found. Run without --skip-build first." >&2
  exit 1
fi
echo "==> Using archive: $ARCHIVE"

echo "==> Uploading archive to $SSH_USER@$HOST:~/jamhawi_deploy.zip"
"$PSCP" -P "$PORT" -hostkey "$HOSTKEY" -pw "$HOSTINGER_SSH_PASSWORD" "$ARCHIVE" "$SSH_USER@$HOST:~/jamhawi_deploy.zip"

if [[ -f ".env.hostinger" ]]; then
  echo "==> Uploading .env.hostinger to $REMOTE_APP_DIR/.env.hostinger"
  "$PSCP" -P "$PORT" -hostkey "$HOSTKEY" -pw "$HOSTINGER_SSH_PASSWORD" ".env.hostinger" "$SSH_USER@$HOST:$REMOTE_APP_DIR/.env.hostinger"
else
  echo "warning: .env.hostinger not found locally — server/start.js will fall back to cPanel env vars." >&2
fi

echo "==> Extracting, installing, building, and restarting on the server"
"$PLINK" -P "$PORT" -hostkey "$HOSTKEY" -pw "$HOSTINGER_SSH_PASSWORD" "$SSH_USER@$HOST" "
  set -e
  cd $REMOTE_APP_DIR
  unzip -o ~/jamhawi_deploy.zip
  export PATH=$REMOTE_NODE_BIN:\$PATH
  npm install && npm run build
  touch tmp/restart.txt
"

echo "==> Waiting for Passenger to reload"
sleep 8
echo "==> Health check: $HEALTH_URL"
curl -s "$HEALTH_URL" && echo
