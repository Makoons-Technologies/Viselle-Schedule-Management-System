#!/usr/bin/env bash
# Cloud Agent start phase — per-boot reconciliation of the runtime services the
# Viselle dev stack needs: the Docker daemon and the local Supabase stack.
# Idempotent: safe to run repeatedly. Dev servers themselves run as terminals.
set -euo pipefail

BACKEND_DIR="/agent/repos/Beauty-Backend-API"
export DOCKER_HOST="unix:///var/run/docker.sock"

# 1) Nested-Docker networking fix: with bridge netfilter on, the legacy iptables
#    FORWARD policy (DROP) silently blocks container-to-container traffic, which
#    breaks Supabase's inter-service connections. Disabling it restores L2 bridging.
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 >/dev/null 2>&1 || true
sudo sysctl -w net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true

# 2) Start the Docker daemon if it is not already serving.
if ! docker info >/dev/null 2>&1; then
  echo "==> starting dockerd"
  # Remove any stale (possibly root-owned) log from a previous boot/snapshot so
  # the redirect below cannot fail with a permission error.
  sudo rm -f /var/log/dockerd.log
  sudo bash -c 'nohup dockerd --storage-driver=fuse-overlayfs >/var/log/dockerd.log 2>&1 &'
  for i in $(seq 1 30); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi
# Allow the ubuntu user (and the Supabase CLI) to reach the daemon socket.
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
docker info >/dev/null 2>&1 && echo "==> docker is ready" || { echo "docker failed to start"; sudo cat /var/log/dockerd.log 2>/dev/null; exit 1; }

if [ ! -d "$BACKEND_DIR" ]; then
  echo "==> backend repo not present; skipping Supabase/seed (frontend-only mode)"
  exit 0
fi

# 3) Bring up the local Supabase stack (idempotent — fast no-op if already running).
echo "==> supabase start"
(cd "$BACKEND_DIR" && npx --yes supabase start) || {
  echo "supabase start failed"; exit 1;
}

# 4) Write the backend .env from the running stack's connection details.
echo "==> writing $BACKEND_DIR/.env"
SUPA_URL="$(cd "$BACKEND_DIR" && npx --yes supabase status -o env 2>/dev/null | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
SUPA_KEY="$(cd "$BACKEND_DIR" && npx --yes supabase status -o env 2>/dev/null | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')"
cat > "$BACKEND_DIR/.env" <<EOF
PORT=3001
APP_URL=http://localhost:3001
APP_PUBLIC_URL=http://localhost:5173
PLATFORM_BOOKING_BASE_URL=http://localhost:5173
JWT_SECRET=dev-local-jwt-secret-change-me
SUPABASE_URL=${SUPA_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPA_KEY}
SMS_SENDING_ENABLED=false
RESEND_FROM_NAME=Viselle
VAPID_SUBJECT=mailto:hello@viselle.net
PLATFORM_SITES_BASE_DOMAIN=viselle.net
API_PUBLIC_BASE_URL=http://localhost:3001
EOF

# 5) Seed demo data (idempotent — the seed script wipes and re-creates dev orgs).
echo "==> seeding demo data"
(cd "$BACKEND_DIR" && npm run seed) || echo "seed failed (non-fatal); continuing"

echo "Start phase complete. Dev servers run in the 'backend' and 'frontend' terminals."
