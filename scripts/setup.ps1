# =====================================================================
# MYE030 — one-shot bootstrap (Windows / PowerShell)
# =====================================================================
# Run from the repo root:
#     .\scripts\setup.ps1
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

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Require-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Error "Missing prerequisite: $Name. $InstallHint"
        exit 1
    }
}

function Test-PortInUse([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -eq "Listen" })
}

function Get-PortOwner([int]$port) {
    $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if (-not $pids) { return "<unknown>" }
    return (Get-Process -Id ($pids | Select-Object -First 1) -ErrorAction SilentlyContinue).ProcessName
}

Write-Host "==> 1/8 Checking prerequisites" -ForegroundColor Cyan
Require-Command docker  "Install Docker Desktop: https://docker.com/products/docker-desktop/"
Require-Command python  "Install Python 3.13: winget install Python.Python.3.13"
Require-Command uv      "Install uv: powershell -c `"irm https://astral.sh/uv/install.ps1 | iex`""
Require-Command node    "Install Node 22 LTS: winget install OpenJS.NodeJS.LTS"
Require-Command pnpm    "Enable pnpm: corepack enable && corepack prepare pnpm@latest --activate"

Write-Host "==> 2/8 Preparing .env" -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "    Created .env from .env.example"
} else {
    Write-Host "    .env already exists, leaving alone"
}

# Parse .env into a hashtable.
$envValues = @{}
Get-Content ".env" | Where-Object { $_ -match "^[A-Z_]+=" } | ForEach-Object {
    $key, $value = $_ -split "=", 2
    $envValues[$key.Trim()] = $value.Trim()
}
$frontendPort = [int]($envValues["FRONTEND_PORT"] | ForEach-Object { if ($_) {$_} else {"5173"} })
$backendPort  = [int]($envValues["BACKEND_PORT"]  | ForEach-Object { if ($_) {$_} else {"8000"} })
$mysqlPort    = [int]($envValues["MYSQL_PORT"]    | ForEach-Object { if ($_) {$_} else {"3306"} })
$rootPwd      = $envValues["MYSQL_ROOT_PASSWORD"]
$container    = $envValues["MYSQL_CONTAINER_NAME"]

Write-Host "==> 3/8 Pre-flight: host ports must be free" -ForegroundColor Cyan
$conflicts = @()
foreach ($pair in @(
    @{ Name = "FRONTEND_PORT"; Port = $frontendPort },
    @{ Name = "BACKEND_PORT" ; Port = $backendPort },
    @{ Name = "MYSQL_PORT"   ; Port = $mysqlPort })) {
    if (Test-PortInUse $pair.Port) {
        $owner = Get-PortOwner $pair.Port
        $conflicts += "    $($pair.Name)=$($pair.Port) is in use by '$owner'"
    }
}
if ($conflicts.Count -gt 0) {
    Write-Host ""
    Write-Warning "Host port conflict detected:"
    $conflicts | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Resolve by either:" -ForegroundColor Yellow
    Write-Host "  (a) stopping the conflicting process (typical culprits: a stale" -ForegroundColor Yellow
    Write-Host "      'pnpm dev' on 5173, a local MySQL service on 3306, another" -ForegroundColor Yellow
    Write-Host "      uvicorn on 8000), or" -ForegroundColor Yellow
    Write-Host "  (b) editing .env and pointing FRONTEND_PORT / BACKEND_PORT /" -ForegroundColor Yellow
    Write-Host "      MYSQL_PORT to free numbers, then re-running this script." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "    All ports free ($frontendPort, $backendPort, $mysqlPort)"

Write-Host "==> 4/8 Starting MySQL container" -ForegroundColor Cyan
docker compose up -d mysql_db
Write-Host "    Waiting for MySQL to accept connections..."
$tries = 0
while ($tries -lt 30) {
    docker exec $container mysqladmin ping -uroot -p"$rootPwd" --silent 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 2
    $tries++
}
if ($tries -eq 30) {
    Write-Error "MySQL did not become ready in 60s. Inspect with: docker compose logs mysql_db"
    exit 1
}
Write-Host "    MySQL is up"

Write-Host "==> 5/8 Installing backend deps with uv" -ForegroundColor Cyan
Push-Location src\backend
uv sync
Pop-Location

Write-Host "==> 6/8 Restoring database from deliverables/db_backup.sql.gz" -ForegroundColor Cyan
if (-not (Test-Path "deliverables\db_backup.sql.gz")) {
    Write-Warning "deliverables\db_backup.sql.gz NOT FOUND."
    Write-Warning "Download from the GitHub Release, or run Path B (ETL):"
    Write-Host "      cd src\backend; uv run python etl/exporter.py; cd ..\.."
    Write-Host "      docker exec -i $container mysql --local-infile=1 -uroot -p$rootPwd < sql_scripts\01_schema.sql"
    Write-Host "      docker exec -i $container mysql --local-infile=1 -uroot -p$rootPwd mye030 < sql_scripts\02_load.sql"
    Write-Host "      docker exec -i $container mysql -uroot -p$rootPwd mye030 < sql_scripts\03_views.sql"
} else {
    Push-Location src\backend
    uv run python -m database.db_restore
    Pop-Location
}

Write-Host "==> 7/8 Installing frontend deps with pnpm" -ForegroundColor Cyan
Push-Location src\frontend
pnpm install --frozen-lockfile
Pop-Location

Write-Host "==> 8/8 Done." -ForegroundColor Green
Write-Host ""
Write-Host "DEVELOPMENT (hot-reload, source maps, dev build):" -ForegroundColor Yellow
Write-Host "  Terminal 1 (backend):  cd src\backend; uv run uvicorn api.main:application --port $backendPort --reload"
Write-Host "  Terminal 2 (frontend): cd src\frontend; pnpm dev"
Write-Host "  → http://localhost:$frontendPort"
Write-Host ""
Write-Host "PRODUCTION (containerised, optimised bundle, single nginx origin):" -ForegroundColor Yellow
Write-Host "  docker compose up -d"
Write-Host "  → http://localhost:$frontendPort (proxies /api, /docs, /redoc, /openapi.json)"
