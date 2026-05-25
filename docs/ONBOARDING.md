# Onboarding — first run on a fresh clone

This is the shortest path from `git clone` to a working app. The
README has more depth; this file is the **first thing to read** if
you have just pulled the project and have nothing installed.

> **Total time:** 20–25 minutes on a clean Windows / macOS / Linux
> machine, of which ~10 minutes is downloading Docker / Python /
> Node installers.

---

## Step 1 — Install the three things you actually need

You only need **Docker** at the bare minimum. Python + Node are
only required if you want to run the host-installed development
path. Docker alone is enough to boot everything.

| Tool | Why | Install once |
|---|---|---|
| **Docker Desktop** (Windows / macOS) or **Docker Engine** (Linux) | Runs MySQL + back-end + front-end | <https://docker.com/products/docker-desktop> |
| (optional) Python 3.13 + `uv` | Run the host-installed back-end with hot reload | `winget install Python.Python.3.13` then `irm https://astral.sh/uv/install.ps1 | iex` |
| (optional) Node 22 + `pnpm` | Run the host-installed front-end with HMR | `winget install OpenJS.NodeJS.LTS` then `corepack enable && corepack prepare pnpm@latest --activate` |

Verify:

```powershell
docker --version
docker compose version
```

On Linux, log out and back in after `usermod -aG docker $USER`.

---

## Step 2 — Clone the repository

```powershell
git clone https://github.com/JohnAng/data-integration-viz-platform.git
cd data-integration-viz-platform
```

The clone is ~85 MiB. Two folders are intentionally **empty** after
cloning:

| Folder | Why it is empty | How to fill it |
|---|---|---|
| `data/` | Raw bibliographic CSVs (DBLP, iCore26, Kaggle); too large to push and licensed by their owners | See Step 4 (Path B only) |
| `deliverables/db_backup.sql.gz` | 172 MiB gzipped mysqldump; exceeds GitHub's 100 MiB hard limit | See Step 4 (Path A — recommended) |

---

## Step 3 — Copy the env template

```powershell
Copy-Item .env.example .env       # Windows
cp .env.example .env              # macOS / Linux
```

The defaults work as-is. If your machine already has something on
port 5173, 8000 or 3306, edit `.env` and change `FRONTEND_PORT`,
`BACKEND_PORT` or `MYSQL_PORT` to a free number.

---

## Step 4 — One command: `python run.py`

The repo ships with a tiny stdlib-only orchestrator at the root.
It auto-detects what is on disk, picks the right scenario,
builds the images on first run, and blocks until everything is
healthy:

```powershell
python run.py
```

That is the whole onboarding for ~95 % of cases. The rest of this
section explains what `run.py` is doing under the hood, and how to
recover when something is missing.



Three scenarios, listed by what you have on hand. Pick **A** unless
the backup file is unavailable.

| You have… | Use… | Walltime on a clean machine |
|---|---|---|
| `deliverables/db_backup.sql.gz` | Path A — auto-restore | **~3 min** |
| Only `data/` (raw CSVs) | Path B — run the ETL | ~5 min |
| Neither | Download the backup first (see below), then Path A | ~3 min + download |

If you have **neither**: the `db_backup.sql.gz` is too large for git
and lives at the Google Drive link printed at the top of
`deliverables/AM2403_prj.txt`. Download it (~172 MiB), drop it at
`deliverables/db_backup.sql.gz`, then continue with Path A.

> When the database is empty (no backup at first boot), the MySQL
> init script prints a full-screen banner inside
> `docker compose logs mysql_db` with the next-step instructions —
> no guessing needed.



### 🅰 Path A — Boot from the backup (3 min, recommended)

> Skip the ETL entirely. The backup carries the schema + all loaded
> rows + views + materialised tables. Best for a quick walk-through.

1. Download **`db_backup.sql.gz`** from the link in
   `deliverables/AM2403_prj.txt` (~172 MiB).
2. Drop it into the `deliverables/` folder:
   ```
   deliverables/db_backup.sql.gz
   ```
3. Boot everything **and wait** until all three services report healthy:
   ```powershell
   docker compose up -d --wait
   ```

The MySQL container streams the backup through `gunzip` into the
`mye030` database on first boot (~2 min). Only when the restore
finishes and TCP becomes available, the MySQL healthcheck passes,
and Compose starts the backend. Once the backend is healthy, the
frontend follows. `--wait` blocks the command until everything is
green — about **3 minutes total** end-to-end on a clean machine.

> **Why `--wait`:** without it, `docker compose up -d` returns as
> soon as containers are *started*, not *healthy*. The MySQL restore
> still has ~2 min to go in the background; opening `:5173`
> immediately would hit a backend that has not yet connected to the
> DB. The `--wait` flag blocks until every healthcheck passes.

### 🅱 Path B — Run the full ETL from the source CSVs (~5 min)

> Use this when you want to re-derive the database from the raw
> bibliographic dumps (DBLP + iCore + Kaggle).

1. Place the source CSVs under `data/` exactly as below:
   ```
   data/
     dblp_dataset/
       input_article.csv         ← DBLP journals dump
       input_inproceedings.csv   ← DBLP conferences dump
     icore26_data/
       iCore26_KilledColumnsForLoading.csv
       icoreCategories.xlsx
     journal_ranking_data_raw/
       journal_ranking_data_raw.csv   ← Kaggle Scimago dump
       bestSubjectArea.csv
   ```
   Sources:
   - DBLP: <https://dblp.org/xml/release/>
   - iCore: <http://portal.core.edu.au/conf-ranks/>
   - Kaggle: search "Scimago Journal Ranking"
2. Bring up MySQL (and let the rest fail; that is expected):
   ```powershell
   docker compose up -d mysql_db
   ```
3. Run the populate-from-ETL helper. It runs the Polars pipeline
   inside the backend image, then pipes the three SQL scripts into
   MySQL — no host-side Python needed.
   ```powershell
   # Windows
   .\scripts\populate_from_etl.ps1
   # macOS / Linux
   ./scripts/populate_from_etl.sh
   ```
4. Restart the backend so it picks up the now-populated schema:
   ```powershell
   docker compose up -d --wait
   ```

---

## Step 5 — Verify the system

Wait until all three containers report healthy:

```powershell
docker compose ps
```

You should see three lines, status `Up (healthy)`.

Smoke tests (any one is enough):

```powershell
# Backend liveness
curl http://localhost:8000/health
# → {"status":"ok"}

# Real data through the API
curl http://localhost:8000/api/meta/totals
# → {"total_articles":2525752,...}

# Data quality of the loaded database
docker exec -i mye030_mysql mysql -uroot -proot mye030 < scripts/data_quality_report.sql
# → row counts, match rates, zero orphan violations
```

Open in a browser:

| URL | What you should see |
|---|---|
| <http://localhost:5173> | Landing page with three KPI tiles, real numbers |
| <http://localhost:5173/dashboard> | Two charts with real data |
| <http://localhost:5173/charts> | Twelve chart variants in a side panel |
| <http://localhost:5173/docs> | Swagger UI listing 28 endpoints |
| <http://localhost:5173/redoc> | Same surface in ReDoc |

---

## What to watch for

| Symptom | What to do |
|---|---|
| `Cannot connect to the Docker daemon` | Start Docker Desktop and wait for the whale icon to stop animating |
| `Bind for 0.0.0.0:XXXX failed: port is already allocated` | Edit `.env`, set `FRONTEND_PORT` / `BACKEND_PORT` / `MYSQL_PORT` to a free number, `docker compose down && docker compose up -d` |
| Container `mye030_frontend` shows `(unhealthy)` but app responds | The healthcheck is overly strict on slow first boot; the app is fine. Wait a minute and re-check |
| `Access denied for user 'Angelakos'@'%'` | The MySQL volume was initialised with different credentials. `docker compose down -v` and re-boot |
| Backend says `Can't connect to MySQL server` | MySQL was not yet healthy when the back-end started. Wait, or run `docker compose restart backend` |
| The app loads but KPI tiles show `—` | `deliverables/db_backup.sql.gz` was missing during the very first boot. Drop the file in place, `docker compose down -v`, `docker compose up -d` |
| Front-end `/docs` shows `Not Found` and the HTML has `/@vite/client` | A stray host-side `pnpm dev` is also listening on `5173`. Close that terminal, **or** flip `FRONTEND_PORT` |

---

## Stopping and restarting

```powershell
docker compose stop        # pause everything (data is kept)
docker compose start       # resume
docker compose down        # remove containers (data volume kept)
docker compose down -v     # remove containers AND wipe the database
```

After `down -v`, the next `docker compose up -d` will re-run the
backup restore from scratch (if `deliverables/db_backup.sql.gz` is
still present).

---

## Where to go next

- `README.md` — full reference (badges, mermaid diagrams, every URL,
  trade-offs table)
- `docs/ARCHITECTURE.md` — the *why* behind every design decision
- `docs/API_REFERENCE.md` — every endpoint with parameter table
- `docs/GLOSSARY.md` — domain terms (SJR, iCore, FoR, quartile, …)
- `docs/REFACTOR.md` — what would change in a follow-up branch
- `deliverables/AM2403_projectReport.pdf` — the final 34-page report
