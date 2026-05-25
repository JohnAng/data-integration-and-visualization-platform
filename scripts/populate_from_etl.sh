#!/usr/bin/env bash
# =====================================================================
# Populate the MySQL container from the raw CSVs in data/ via the ETL.
# Use this when you have data/ but no db_backup.sql.gz.
# Requires: docker compose stack already up (mysql_db at minimum).
# Run from repo root.
# =====================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck disable=SC1091
source <(grep -E "^[A-Z_]+=" .env)
: "${MYSQL_CONTAINER_NAME:=mye030_mysql}"

if [ ! -d data/dblp_dataset ] || [ ! -d data/icore26_data ] || [ ! -d data/journal_ranking_data_raw ]; then
    echo "data/ must contain dblp_dataset, icore26_data, journal_ranking_data_raw" >&2
    exit 1
fi

if ! docker inspect -f '{{.State.Running}}' "$MYSQL_CONTAINER_NAME" 2>/dev/null | grep -q true; then
    echo "MySQL container '$MYSQL_CONTAINER_NAME' must be running. Start with: docker compose up -d mysql_db" >&2
    exit 1
fi

echo "==> 1/5 Running ETL inside the backend container (Polars + rapidfuzz)..."
docker compose run --rm backend python -m etl.exporter

echo "==> 2/5 Loading schema (01_schema.sql)..."
docker exec -i "$MYSQL_CONTAINER_NAME" mysql --local-infile=1 -uroot -p"$MYSQL_ROOT_PASSWORD" < sql_scripts/01_schema.sql

echo "==> 3/5 Granting the application user..."
docker exec "$MYSQL_CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO 'Angelakos'@'%'; FLUSH PRIVILEGES;"

echo "==> 4/5 Bulk loading 9 CSVs (02_load.sql)..."
docker exec -i "$MYSQL_CONTAINER_NAME" mysql --local-infile=1 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < sql_scripts/02_load.sql

echo "==> 5/5 Creating views and materialised tables (03_views.sql)..."
docker exec -i "$MYSQL_CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < sql_scripts/03_views.sql

echo ""
echo "✓ Database populated. Quality report:"
docker exec -i "$MYSQL_CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < scripts/data_quality_report.sql

echo ""
echo "Now restart the backend so its connection pool picks up the new schema:"
echo "  docker compose restart backend"
