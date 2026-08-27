#!/usr/bin/env bash
# Cloud Agent start phase — per-boot reconciliation of the runtime services the
# Viselle dev stack needs: the Docker daemon and the local Supabase stack.
# Idempotent: safe to run repeatedly. Dev servers themselves run as terminals.
#
# NOTE: intentionally NOT using `set -e`. `supabase start` can return a
# transient non-zero while containers are still coming up; we handle readiness
# explicitly below rather than aborting mid-way (which would skip .env + seed).
set -uo pipefail

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

# 3) Bring up the local Supabase stack. May exit non-zero while still starting;
#    we wait for readiness below instead of trusting the exit code.
echo "==> supabase start"
(cd "$BACKEND_DIR" && npx --yes supabase start) || echo "supabase start returned non-zero (likely still starting or already up); continuing"

# 3b) Wait until Supabase is genuinely ready. Gating on the raw REST port is not
#     enough: Kong answers while the DB is still `starting`, so `supabase status`
#     returns empty credentials. Poll until status yields the URL + service key
#     AND an authenticated query against a migrated table succeeds. Only then is
#     it safe to write .env and seed (prevents the "running but broken" race).
echo "==> waiting for Supabase to be ready (credentials + authenticated query)"
SUPA_URL=""; SUPA_KEY=""; supa_ready=0
for i in $(seq 1 120); do
  env_out="$(cd "$BACKEND_DIR" && npx --yes supabase status -o env 2>/dev/null)"
  SUPA_URL="$(printf '%s\n' "$env_out" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
  SUPA_KEY="$(printf '%s\n' "$env_out" | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')"
  if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' \
      -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
      "$SUPA_URL/rest/v1/organizations?select=id&limit=1" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then supa_ready=1; break; fi
  fi
  sleep 2
done
if [ "$supa_ready" != "1" ]; then
  echo "Supabase did not become fully ready in time (url='${SUPA_URL:-}' keyPresent=$([ -n "${SUPA_KEY:-}" ] && echo yes || echo no))"
  exit 1
fi

# 4) Write the backend .env from the running stack's connection details.
echo "==> writing $BACKEND_DIR/.env"
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
