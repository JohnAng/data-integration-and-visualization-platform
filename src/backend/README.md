# Backend — MYE030 Data Integration & Visualization Platform

ETL pipeline + FastAPI HTTP API for the bibliographic analytics project.

## Layout

```
src/backend/
├── pyproject.toml          uv project descriptor (Python 3.13, asyncmy stack)
├── .python-version         3.13
├── api/                    FastAPI HTTP layer
│   ├── main.py             application factory + lifespan
│   ├── settings.py         pydantic-settings, reads ../../.env
│   ├── database.py         asyncmy pool wrapper
│   ├── dependencies.py     FastAPI dependency providers
│   ├── errors.py           RFC 7807 Problem Details handlers
│   ├── schemas/            Pydantic response DTOs
│   ├── data_access/        DAO classes with raw parameterized SQL
│   └── routers/            REST endpoint modules
├── etl/
│   ├── transformer.py      Polars extract + transform + entity resolution
│   └── exporter.py         CSV writer for the SQL LOAD DATA stage
├── database/
│   ├── settings.py         BackupSettings (pydantic-settings)
│   ├── docker_runtime.py   container reachability check
│   ├── db_backup.py        gzipped mysqldump → deliverables/db_backup.sql.gz
│   └── db_restore.py       restore the dump back into the container
├── tests/
│   ├── unit/               offline tests (no MySQL needed)
│   └── integration/        integration tests against a real MySQL fixture
└── api.http                Manual HTTP request playbook
```

Test suite totals: **~200 tests passing**, 95 % line coverage. Heavy
analytical views are pre-materialised into physical InnoDB tables by
`sql_scripts/03_views.sql` so every endpoint responds in under one
second on the full corpus (see `docs/API_REFERENCE.md` for the latency
table).

The HTTP surface exposes **28 business endpoints** under `/api/*` plus
`/health`, `/docs`, `/redoc`, `/openapi.json`. Routers:
`journals` (5) · `conferences` (5) · `authors` (4) · `years` (5) ·
`charts` (7) · `meta` (2).

## Dependency files

Two lockable representations of the same dependency graph live side
by side:

| File | Purpose | Consumer |
|---|---|---|
| `pyproject.toml` + `uv.lock` | Canonical source. Hash-pinned, reproducible. | `uv` (recommended) |
| `requirements.txt` | Runtime-only flat list, generated from the lockfile. | Plain `pip` (no `uv` needed) |
| `requirements-dev.txt` | Runtime + dev (pytest, ruff, pyright, ipykernel, jupyter). | Plain `pip` |

`requirements.txt` is re-exported with:

```powershell
uv export --format requirements-txt --no-dev --no-hashes -o requirements.txt
uv export --format requirements-txt --no-hashes -o requirements-dev.txt
```

Run this whenever a dependency is added or removed so the
pip-fallback path stays in sync.

### Install path A — `uv` (fast, lockfile-aware)

```powershell
uv sync                              # creates .venv and installs everything
```

### Install path B — plain `pip` (no `uv` required)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1         # Windows PowerShell
# source .venv/bin/activate          # macOS / Linux
pip install -r requirements-dev.txt  # runtime + dev (use requirements.txt for runtime only)
```

## Common commands

```powershell
# From this directory (src/backend)
uv sync                              # install/refresh dependencies
uv run pytest tests/                 # run unit tests
uv run python etl/transformer.py     # ETL transform only, prints stats
uv run python etl/exporter.py        # transform + write CSVs to ../../exports/
uv run uvicorn api.main:application --reload --port 8000  # start API server

uv run python -m database.db_backup  # → deliverables/db_backup.sql.gz
uv run python -m database.db_restore # ← deliverables/db_backup.sql.gz
```

Sample-first iteration:

```powershell
$env:ETL_SAMPLE_ROWS = "100000"; uv run python etl/exporter.py
```

## Manual API smoke testing

Open `api.http` in PyCharm or VS Code (with the REST Client extension) and
click the run icon next to any request. The file covers every business
endpoint plus a few intentional error paths so you can verify the RFC 7807
problem-details body.

## PyCharm setup

If PyCharm flags imports as unresolved, the interpreter likely is not
pointing at the project virtualenv. Fix:

1. **File** → **Settings** → **Project: Data Integration Viz Platform** → **Python Interpreter**
2. Click the gear icon → **Add Interpreter** → **Add Local Interpreter…**
3. Choose **Existing** and point at `src/backend/.venv/Scripts/python.exe`
4. Click **OK**. PyCharm reindexes the venv (≈30s)
5. Right-click `src/backend/tests` → **Mark Directory as** → **Test Sources Root**
6. If imports still red: **File** → **Invalidate Caches…** → **Invalidate and Restart**

For run configurations:

- **API dev server**: module `uvicorn`, parameters `api.main:application --reload --port 8000`, working directory `src/backend`
- **Tests**: pytest, target `src/backend/tests`, working directory `src/backend`
