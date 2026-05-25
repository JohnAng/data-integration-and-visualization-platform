# =====================================================================
# Populate the MySQL container from the raw CSVs in data/ via the ETL.
# Use this when you have data/ but no db_backup.sql.gz.
# Requires: docker compose stack already up (mysql_db at minimum).
# Run from repo root.
# =====================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

# Load .env values
$envValues = @{}
Get-Content ".env" | Where-Object { $_ -match "^[A-Z_]+=" } | ForEach-Object {
    $key, $value = $_ -split "=", 2
    $envValues[$key.Trim()] = $value.Trim()
}
$rootPwd   = $envValues["MYSQL_ROOT_PASSWORD"]
$dbName    = $envValues["MYSQL_DATABASE"]
$container = $envValues["MYSQL_CONTAINER_NAME"]

function Require([string]$msg, [scriptblock]$check) {
    if (-not (& $check)) { Write-Error $msg; exit 1 }
}

Require "data/ folder must contain dblp_dataset, icore26_data, journal_ranking_data_raw" {
    (Test-Path "data\dblp_dataset") -and (Test-Path "data\icore26_data") -and (Test-Path "data\journal_ranking_data_raw")
}
Require "MySQL container '$container' must be running. Start with: docker compose up -d mysql_db" {
    (docker inspect -f '{{.State.Running}}' $container 2>$null) -eq "true"
}

Write-Host "==> 1/5 Running ETL inside the backend container (Polars + rapidfuzz)..." -ForegroundColor Cyan
docker compose run --rm backend python -m etl.exporter

Write-Host "==> 2/5 Loading schema (01_schema.sql)..." -ForegroundColor Cyan
Get-Content sql_scripts\01_schema.sql -Raw | docker exec -i $container mysql --local-infile=1 -uroot -p$rootPwd

Write-Host "==> 3/5 Granting the application user..." -ForegroundColor Cyan
docker exec $container mysql -uroot -p$rootPwd -e "GRANT ALL PRIVILEGES ON ${dbName}.* TO 'Angelakos'@'%'; FLUSH PRIVILEGES;"

Write-Host "==> 4/5 Bulk loading 9 CSVs (02_load.sql)..." -ForegroundColor Cyan
Get-Content sql_scripts\02_load.sql -Raw | docker exec -i $container mysql --local-infile=1 -uroot -p$rootPwd $dbName

Write-Host "==> 5/5 Creating views and materialised tables (03_views.sql)..." -ForegroundColor Cyan
Get-Content sql_scripts\03_views.sql -Raw | docker exec -i $container mysql -uroot -p$rootPwd $dbName

Write-Host ""
Write-Host "✓ Database populated. Quality report:" -ForegroundColor Green
Get-Content scripts\data_quality_report.sql -Raw | docker exec -i $container mysql -uroot -p$rootPwd $dbName

Write-Host ""
Write-Host "Now restart the backend so its connection pool picks up the new schema:" -ForegroundColor Yellow
Write-Host "  docker compose restart backend" -ForegroundColor Yellow
