#!/usr/bin/env bash
# =====================================================================
# MYE030 — one-shot bootstrap (macOS / Linux)
# =====================================================================
# Run from the repo root:
#     ./scripts/setup.sh
# What it does (host-side Path A — restore from backup):
#   1. Verify prerequisites (docker, python, uv, node, pnpm).
#   2. Create .env from .env.example if missing.
#   3. Pre-flight host port check (FRONTEND/BACKEND/MYSQL).
#   4. Bring up the MySQL container.
#   5. Install backend Python deps with uv.
#   6. Restore deliverables/db_backup.sql.gz into the container.
#   7. Install frontend deps with pnpm.
#   8. Print next-step commands (the two long-running servers).
#
# Re-run safe: every step is idempotent.
# =====================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

require_command() {
    local name="$1" hint="$2"
    if ! command -v "$name" >/dev/null 2>&1; then
        echo "Missing prerequisite: $name. $hint" >&2
        exit 1
    fi
}

port_in_use() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "(:|\.)${port}$"
    else
        return 1
    fi
}

port_owner() {
    local port="$1"
    if command -v lsof >/dev/null 2>&1; then
        lsof -iTCP:"$port" -sTCP:LISTEN -nP 2>/dev/null | awk 'NR==2 {print $1" (pid "$2")"}'
    else
        echo "<unknown>"
    fi
}

echo "==> 1/8 Checking prerequisites"
require_command docker  "Install Docker (https://docker.com)"
require_command python3 "Install Python 3.13"
require_command uv      "Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
require_command node    "Install Node 22 LTS"
require_command pnpm    "Enable pnpm: corepack enable && corepack prepare pnpm@latest --activate"

echo "==> 2/8 Preparing .env"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "    Created .env from .env.example"
else
    echo "    .env already exists, leaving alone"
fi

# Source .env (skip comments and blank lines).
set -a
# shellcheck disable=SC1091
source <(grep -E "^[A-Z_]+=" .env)
set +a
: "${FRONTEND_PORT:=5173}"
: "${BACKEND_PORT:=8000}"
: "${MYSQL_PORT:=3306}"

echo "==> 3/8 Pre-flight: host ports must be free"
conflicts=()
for pair in "FRONTEND_PORT:${FRONTEND_PORT}" "BACKEND_PORT:${BACKEND_PORT}" "MYSQL_PORT:${MYSQL_PORT}"; do
    name="${pair%%:*}"
    value="${pair##*:}"
    if port_in_use "$value"; then
        owner="$(port_owner "$value")"
        conflicts+=("    ${name}=${value} is in use by ${owner}")
    fi
done
if [ "${#conflicts[@]}" -gt 0 ]; then
    echo ""
    echo "WARNING: Host port conflict detected:" >&2
    for line in "${conflicts[@]}"; do echo "$line" >&2; done
    cat >&2 <<EOF

Resolve by either:
  (a) stopping the conflicting process (typical culprits: a stale
      'pnpm dev' on 5173, a local MySQL service on 3306, another
      uvicorn on 8000), or
  (b) editing .env and pointing FRONTEND_PORT / BACKEND_PORT /
      MYSQL_PORT to free numbers, then re-running this script.

EOF
    exit 1
fi
echo "    All ports free (${FRONTEND_PORT}, ${BACKEND_PORT}, ${MYSQL_PORT})"

echo "==> 4/8 Starting MySQL container"
docker compose up -d mysql_db
echo "    Waiting for MySQL to accept connections..."
tries=0
until docker exec "$MYSQL_CONTAINER_NAME" mysqladmin ping -uroot -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null 2>&1; do
    sleep 2
    tries=$((tries + 1))
    if [ $tries -ge 30 ]; then
        echo "MySQL did not become ready in 60s. Inspect with: docker compose logs mysql_db" >&2
        exit 1
    fi
done
echo "    MySQL is up"

echo "==> 5/8 Installing backend deps with uv"
( cd src/backend && uv sync )

echo "==> 6/8 Restoring database from deliverables/db_backup.sql.gz"
if [ ! -f deliverables/db_backup.sql.gz ]; then
    cat <<EOF >&2
WARNING: deliverables/db_backup.sql.gz NOT FOUND.
Download from the GitHub Release, or run Path B (ETL):
  cd src/backend && uv run python etl/exporter.py && cd ../..
  docker exec -i $MYSQL_CONTAINER_NAME mysql --local-infile=1 -uroot -p$MYSQL_ROOT_PASSWORD < sql_scripts/01_schema.sql
  docker exec -i $MYSQL_CONTAINER_NAME mysql --local-infile=1 -uroot -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < sql_scripts/02_load.sql
  docker exec -i $MYSQL_CONTAINER_NAME mysql -uroot -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < sql_scripts/03_views.sql
EOF
else
    ( cd src/backend && uv run python -m database.db_restore )
fi

echo "==> 7/8 Installing frontend deps with pnpm"
( cd src/frontend && pnpm install --frozen-lockfile )

echo "==> 8/8 Done."
cat <<EOF

DEVELOPMENT (hot-reload, source maps, dev build):
  Terminal 1 (backend):  cd src/backend && uv run uvicorn api.main:application --port ${BACKEND_PORT} --reload
  Terminal 2 (frontend): cd src/frontend && pnpm dev
  → http://localhost:${FRONTEND_PORT}

PRODUCTION (containerised, optimised bundle, single nginx origin):
  docker compose up -d
  → http://localhost:${FRONTEND_PORT} (proxies /api, /docs, /redoc, /openapi.json)

EOF
