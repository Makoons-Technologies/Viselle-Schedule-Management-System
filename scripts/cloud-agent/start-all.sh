#!/usr/bin/env bash
# Cloud Agent start command — brings up the full Viselle dev stack on each boot
# and stays attached (Cursor's `start` runs one long-lived command).
#   1. Docker daemon + local Supabase + seed (via start.sh)
#   2. backend API dev server  (http://localhost:3001)
#   3. frontend Vite dev server (http://localhost:5173)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="/agent/repos/Viselle-Schedule-Management-System"
BACKEND_DIR="/agent/repos/Beauty-Backend-API"

# 1) Infrastructure: Docker + Supabase + seed (idempotent).
bash "$SCRIPT_DIR/start.sh"

start_server() {
  local name="$1" dir="$2" log="/tmp/${1}.log"
  if [ -d "$dir" ]; then
    echo "==> starting $name dev server ($dir)"
    ( cd "$dir" && nohup npm run dev >"$log" 2>&1 & )
  fi
}

# 2 + 3) Dev servers (backgrounded so they survive; logs tailed below).
start_server backend "$BACKEND_DIR"
start_server frontend "$FRONTEND_DIR"

# Wait briefly for the frontend to answer, then report status.
for i in $(seq 1 30); do
  if curl -sf http://localhost:5173 >/dev/null 2>&1; then break; fi
  sleep 1
done
echo "==> frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 || echo down) | backend health: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/v1/docs/public-booking-api || echo down)"
echo "==> Viselle dev stack is up (frontend :5173, backend :3001, supabase :54321)."

# Stay attached and surface logs (Cursor's start command is expected to run long-lived).
touch /tmp/backend.log /tmp/frontend.log
exec tail -n +1 -F /tmp/backend.log /tmp/frontend.log
