#!/bin/bash
# =====================================================================
# Runs once, on first boot of the mysql_db container.
# If deliverables/db_backup.sql.gz is mounted at /backup, restore it
# into MYSQL_DATABASE. Otherwise print a loud, actionable message so
# the operator knows the database is empty and what to do next.
# =====================================================================
set -e

BACKUP="/backup/db_backup.sql.gz"

if [ -f "$BACKUP" ]; then
    echo "[mysql-init] Restoring $BACKUP into $MYSQL_DATABASE …"
    gunzip -c "$BACKUP" | mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE"
    echo "[mysql-init] Restore complete."
else
    cat <<'EOF'

####################################################################
#  DATABASE IS EMPTY — NO BACKUP FILE FOUND                        #
####################################################################
#
#  Tried to read /backup/db_backup.sql.gz but it is not there.
#  The mye030 schema is created but contains no tables, so the
#  back-end will return HTTP 500 for every query.
#
#  Two ways to populate it:
#
#  -- Option 1: drop the gzipped backup in place --------------------
#     Download db_backup.sql.gz from the link in
#     deliverables/AM2403_prj.txt (Google Drive folder, ~172 MiB)
#     and place it at:
#         deliverables/db_backup.sql.gz
#     Then recreate the stack so this init script runs again:
#         docker compose down -v
#         docker compose up -d --wait
#
#  -- Option 2: run the ETL from raw CSVs ---------------------------
#     Place the DBLP / iCore / Kaggle CSVs under data/ as documented
#     in docs/ONBOARDING.md (Step 4, Path B), then run:
#         scripts/populate_from_etl.ps1     (Windows)
#         scripts/populate_from_etl.sh      (macOS / Linux)
#     followed by:
#         docker compose restart backend
#
####################################################################

EOF
fi
