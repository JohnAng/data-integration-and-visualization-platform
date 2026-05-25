# Turnin checklist — MYE030 / 2025-2026

Sources:
- `documents/turnin_instructions.md`
- `documents/announcement_page.md`
- `documents/ProjectDescription-2025-2026.pdf`

Deadline: **2026-05-26 16:59 (Athens time)**.

---

## A. Turnin payload (the text file uploaded to `prj@mye030`)

- [x] Filename matches the convention: **`AM2403_prj.txt`**
      (single-person team — only my AM, no underscores for missing members).
      File present at `deliverables/AM2403_prj.txt`.
- [x] Contains AM (`2403`) and full name (`Ιωάννης Αγγελάκος`).
- [x] Contains the **GitHub repository link** with everything the
      grader needs.
- [x] Contains anything else worth noting (deadline, deliverables
      list, video link / file). Re-read before upload.

Upload command:

```bash
turnin prj@mye030 AM2403_prj.txt
```

> File size limit per upload is 10 MB. The turnin text file is
> kilobytes; safe.

---

## B. GitHub repository structure

- [x] Root `README.md` with team members + technical details
      (currently in place; comprehensive).
- [x] `src/` folder with the source code (backend + frontend).
- [x] `data/` folder (raw CSVs are git-ignored on purpose);
      the data is reproducible via the gzipped backup or
      the documented sources.
- [x] `deliverables/` folder with:
  - [x] `AM2403_projectReport.pdf` — final report (32 pages).
  - [ ] `AM2403_demo.mp4` — demo video (~10 min). **PENDING**.
  - [x] `db_backup.sql.gz` — gzipped mysqldump (auto-restored on
        first `docker compose up`).

---

## C. Final report PDF

Required content (per the announcement and project brief):

- [x] Title page (university, course code, AM, name, semester).
- [x] Changelog / version history.
- [x] Logical schema design (ERD with PKs / FKs).
- [x] Physical schema configuration (DBMS, storage engine, charset,
      pool, indexes, views, materialised tables, security).
- [x] ETL architecture (extract / transform / load / post-load) with
      entity resolution explanation and rejection log.
- [x] Back-end package diagram + deployment diagram.
- [x] Front-end packages, routes, chart families.
- [x] Sample Q & A screenshots covering landing, dashboard, list
      pages, profiles, charts.
- [x] Stack trade-offs section.
- [x] Test coverage section (backend + vitest + Playwright).
- [x] Two-mode delivery (production Docker vs development host).
- [x] Observable surfaces (Swagger, ReDoc, openapi.json, CLI, REST
      Client playbook).

Build instructions:

```bash
cd deliverables/report
make            # xelatex twice + copy main.pdf → ../AM2403_projectReport.pdf
```

---

## D. Demo video

- [ ] Duration ~15 minutes. The project brief (page 9) specifies
      three parts of ~5' each (intro, internal structure, demo).
      The announcement page reads "περίπου 10 λεπτά"; in case of
      conflict the brief governs. Aim for 13–16 min total.
- [ ] Shows the system in operation (live demo through the
      dockerized stack on `:5173`).
- [ ] Explains the internal structure and design.
- [ ] Format `.mp4`, H.264, ≤ 100 MB if committed to the repo.
- [ ] Alternative: upload to YouTube / Vimeo and put the link
      inside `AM2403_prj.txt` and inside the PDF.
- [ ] Plays back without external CDN dependencies.

Per-cut shooting plan: `../VIDEO_TRANSCRIPT.md` (untracked file at
repo root).

---

## E. Database deliverables

- [x] `sql_scripts/01_schema.sql` — DDL (CREATE TABLE + indexes + FKs).
- [x] `sql_scripts/02_load.sql` — `LOAD DATA LOCAL INFILE` per table.
- [x] `sql_scripts/03_views.sql` — 11 views + 6 materialised tables.
- [x] `deliverables/db_backup.sql.gz` — gzipped mysqldump.
- [x] Restore script (`src/backend/database/db_restore.py`).
- [x] Backup script (`src/backend/database/db_backup.py`).

---

## F. Back-end deliverables

- [x] ETL pipeline that reproduces every CSV in `exports/` from the
      raw `data/` inputs without touching MySQL.
- [x] FastAPI app with **28 endpoints** under `/api/*`, plus
      `/health`, `/docs`, `/redoc`, `/openapi.json`.
- [x] All DAOs use **raw, parameterised SQL** (no ORM, no f-strings
      in SQL).
- [x] RFC 7807 problem-details on every error path.
- [x] `pytest` suite passes (~200 tests, 95 % line coverage).

---

## G. Front-end deliverables

- [x] 13 file-based routes (Landing, Dashboard, 4 list pages,
      4 profile pages, 2 paper-detail pages, Charts playground).
- [x] LineCharts, BarCharts, ScatterPlots (brief mandatory)
      + Heatmap, StackedArea, HorizontalBarChart (extra).
- [x] Year-range filter that recomputes every aggregate.
- [x] Server-side sort + sticky header on every table.
- [x] Vitest suite passes (~160 tests).
- [x] Playwright suite passes (~50 specs).

---

## H. Reproducibility

- [x] `python run.py` (or `docker compose up -d --wait`) brings the
      full stack online with auto-detection of the right scenario
      (backup-restore, full ETL, or guidance-only).
- [x] Host-side path (`scripts/setup.ps1` / `scripts/setup.sh`) for
      developers who prefer to run uvicorn + Vite directly.
- [x] `.env.example` checked in; secrets stay local.
- [x] Pre-flight port check in the setup script.

---

## I. Day-of checklist

- [ ] Final `git pull` + clean working tree.
- [ ] Re-run `docker compose up -d` from a clean clone in a temp
      folder to verify end-to-end repeatability.
- [ ] Re-check the PDF page count + cover page.
- [ ] Re-check the GitHub repo is **public** (or shared with the
      examiner).
- [ ] Record the video.
- [ ] Push video + final README touches.
- [ ] Update `AM2403_prj.txt` with the video link if hosted off-repo.
- [ ] Submit:
      ```bash
      turnin prj@mye030 AM2403_prj.txt
      ```
- [ ] Take a screenshot of the turnin confirmation.

---

## J. Post-submission

- [ ] Open a `last-minute-refactoring` branch from `main`.
- [ ] Work through `docs/REFACTOR.md`.
- [ ] Do NOT push the refactor branch into `main` until after the
      defence / grading window.
