#!/usr/bin/env bash
# Cloud Agent install phase — idempotent dependency setup for the Viselle dev stack.
# Runs after the repo is checked out. Must terminate and must NOT start long-running
# services (Docker / Supabase / dev servers live in start.sh + terminals).
set -euo pipefail

FRONTEND_DIR="/agent/repos/Viselle-Schedule-Management-System"
BACKEND_DIR="/agent/repos/Beauty-Backend-API"
SERENITY_DIR="/agent/repos/Viselle-Serenity-Demo-Site"

install_repo() {
  local dir="$1"
  if [ -d "$dir" ] && [ -f "$dir/package-lock.json" ]; then
    echo "==> npm ci in $dir"
    (cd "$dir" && npm ci --no-audit --no-fund)
  else
    echo "==> skip $dir (not present)"
  fi
}

# Frontend .env (safe local defaults; points the SPA at the local API).
if [ -d "$FRONTEND_DIR" ] && [ ! -f "$FRONTEND_DIR/.env" ]; then
  echo "==> writing $FRONTEND_DIR/.env"
  cat > "$FRONTEND_DIR/.env" <<'EOF'
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_CONTACT_EMAIL=hello@viselle.net
VITE_BOOKING_BASE_URL=http://localhost:5173
VITE_SITE_URL=http://localhost:5173
VITE_SITES_BASE_DOMAIN=viselle.net
VITE_PUBLIC_API_DOCS_URL=/docs/api
EOF
fi

install_repo "$FRONTEND_DIR"
install_repo "$BACKEND_DIR"
install_repo "$SERENITY_DIR"

echo "Install phase complete."
