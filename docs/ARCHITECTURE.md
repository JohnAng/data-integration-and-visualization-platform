# Architecture & decisions

This document records the major architectural choices, the alternatives
considered, the trade-offs taken and the resulting consequences. The
format is loosely inspired by [Architecture Decision Records (ADRs)](https://adr.github.io/).
Each section is a single decision; sections can be read in any order.

---

## 1. No ORM — raw SQL via asyncmy

**Context.** The project brief explicitly forbids any ORM or SQL
builder and requires the back-end data processing to happen inside
the DBMS.

**Alternatives considered.**
- SQLAlchemy Core (still a builder, still forbidden).
- Django ORM, Tortoise, SQLModel, peewee (all forbidden by the brief).
- Sync `pymysql` (works, but blocks the event loop).
- Async `aiomysql` (works; ~4× slower than asyncmy on the same API).

**Decision.** Use `asyncmy` directly. Wrap it in a tiny `Database`
helper that exposes `fetch_all`, `fetch_one` and `execute` with
explicit parameter binding (`%s` placeholders, never f-strings).

**Consequences.**
- ✅ Conforms to the brief.
- ✅ Maximum throughput per connection.
- ✅ Forces the team to *understand* every query (no hidden N+1s).
- ⚠️ Every new endpoint costs one DAO method + one SQL string.
- ⚠️ No "scaffold a CRUD" shortcut; this is acceptable because the
  domain is read-only and the surface is small (28 endpoints).

---

## 2. ETL in Polars, never touches MySQL

**Context.** The brief says the Python pipeline ends at CSV export;
schema creation and bulk load happen exclusively through SQL scripts
that a human or CI runs.

**Alternatives considered.**
- pandas (slower, less memory-efficient than Polars on this workload).
- DuckDB-as-intermediate (overkill for a one-shot transform).
- Spark / Dask (massive over-engineering for ~7M rows).

**Decision.** `polars.LazyFrame` end-to-end inside `etl/transformer.py`.
`etl/exporter.py` writes the nine resulting CSVs to `exports/` with
`null_value="\N"` so they survive `LOAD DATA LOCAL INFILE` round-trips.

**Consequences.**
- ✅ Rust-backed columnar engine, ~10× faster than pandas on this size.
- ✅ Memory profile fits comfortably on a 16 GB laptop.
- ✅ Clean separation: Python does not need DB credentials at ETL time.
- ⚠️ Polars API is younger; some idiom searches take longer.

---

## 3. Hybrid entity resolution (exact + fuzzy)

**Context.** DBLP article rows reference venues by short forms
(`EDBT`, `IEEE Trans. Knowl. Data Eng.`). Kaggle and iCore use long
forms or canonical acronyms. We need to join across them.

**Alternatives considered.**
- Pure exact match (high precision, low recall — many DBLP venues
  would never link to a ranking).
- Pure fuzzy match (high recall, but conferences carry their own
  *acronyms* that match cleanly — fuzz adds false positives).
- ML-based entity resolution (training data unavailable).

**Decision.**
- **Conferences:** case-insensitive exact join of normalised DBLP
  `booktitle` against iCore `Acronym`. Recall ~19 %, precision 100 %.
- **Journals:** `rapidfuzz.token_set_ratio ≥ 85` over pre-normalised
  titles (lowercase, expanded abbreviations such as
  `Trans. → Transactions`).
- **Authors:** strict `|`-split on the DBLP authors field then
  per-name `strip()`. The brief states author synonymy is out of scope.

**Consequences.**
- ✅ Reproducible; both algorithms are deterministic.
- ✅ No silent loss — failures land in `rejection_logs` with reason.
- ⚠️ ~81 % of DBLP conferences carry no iCore ranking; the UI exposes
  a `ranked_only` filter so the gap is visible to the user.

---

## 4. Wide journal dimension (denormalised ranking)

**Context.** Kaggle ships 16 ranking metrics per journal. The textbook
move is a separate `journal_rankings` table joined on `journal_id`.

**Alternatives considered.**
- Strict normalisation (separate `journal_rankings` table).
- Document-style JSON column (hides metrics from SQL plans).

**Decision.** Inline every ranking column into `lookup_journals`.

**Consequences.**
- ✅ Every journal-profile query is one row, no join.
- ✅ Index design is simpler: one composite per common filter.
- ⚠️ +120 B per journal row × 1 423 rows ≈ 170 KB extra storage.
  Negligible relative to the fact tables.
- ⚠️ Update anomalies are not a concern: ranking data is read-only
  between ETL runs (it cannot drift inside the warehouse).

---

## 5. Materialised tables for heavy aggregates

**Context.** `view_author_profile`, `view_year_summary`,
`view_subject_area_yearly_summary` and friends do `COUNT(DISTINCT …)`
over millions of rows. Computing them per request blew past the
1-second target.

**Alternatives considered.**
- MySQL `CREATE INDEXED VIEW` — not supported in 8.0.
- Application-side caching (Redis / in-memory) — fragile for
  cold-start; defeats the "processing in DBMS" rule.
- Pre-computed JSON files served as static assets — works but is
  outside the relational layer.

**Decision.** Append physical InnoDB tables to `sql_scripts/03_views.sql`,
populated with `CREATE TABLE materialized_X AS SELECT … FROM view_X`.
DAOs read from the materialised version. Views remain in the schema
for documentation and ad-hoc queries.

**Consequences.**
- ✅ Aggregates that took 11–46 s drop to 0.24–0.26 s. See
  `docs/API_REFERENCE.md` for the latency comparison.
- ✅ Aligns with the static post-ETL data-warehouse pattern.
- ⚠️ Materialised tables are read-only between `03_views.sql` runs
  (correct for our workload: one ingest, many reads).

---

## 5a. Join strategy across the star

**Context.** Every profile / chart endpoint joins one fact table to
one lookup, frequently passes through a bridge, and occasionally
unions the two fact tables.

**Decision.** Concrete join patterns are codified per query family:

| Endpoint family | Join pattern | Why |
|---|---|---|
| Journal / conference profile | `fact_*_articles` INNER JOIN `lookup_*` on `id` | Article without a parent venue is impossible by FK, so INNER is safe |
| Article authors list | `fact_*_articles` LEFT JOIN `bridge_*_authors` LEFT JOIN `lookup_authors` | LEFT so articles with empty author lists still render with their metadata |
| Year article list | `fact_journal_articles UNION ALL fact_conference_articles` (filtered by year) → INNER JOIN venues | `UNION ALL` keeps duplicates from different sources separately; INNER because every article has a venue |
| Author profile | `lookup_authors` INNER JOIN `materialized_author_profile` | Profile materialised, so the union of both bridges happens once at ETL time, never per request |
| Yearly stats (journal/conference) | `view_*_yearly_statistics`, which CTEs the fact table on `(venue_id, year)`, GROUP BY year | Single GROUP BY scan over a covering index |
| Charts: subject-area / FoR yearly | `materialized_subject_area_yearly_summary` (or FoR sibling) | Pre-materialised because the source view does `COUNT(DISTINCT journal_id) × N years × M areas` |
| Charts: authors-vs-articles scatter | `materialized_authors_vs_articles_scatter_*` | Same reason; the source view crosses fact ⨯ bridge for every venue |

**Why this matters.**
- INNER vs LEFT was picked per query based on FK guarantees, not by
  reflex. A wrong LEFT inflates the row count; a wrong INNER drops
  legitimate rows.
- `UNION ALL` (not `UNION`) where deduplication is impossible by
  construction — `article_id` is unique within each fact table but
  the two tables have overlapping ranges, so `UNION` would silently
  collapse genuinely-distinct rows. Always `UNION ALL`.
- `COUNT(DISTINCT)` only appears inside the materialised path; the
  per-request path uses pre-aggregated columns.

**Consequences.**
- ✅ Every request runs at most one scan + one or two joins on
  indexed columns.
- ✅ The slow joins (full corpus, count-distinct) happen once at
  ETL post-load, not per request.
- ⚠️ The cost of the strategy is that every new chart variant has
  to think about which side (per-request vs materialised) it
  belongs on. The README's *Performance* table makes the answer
  visible.

---

## 5b. Index strategy

**Context.** The fact tables sit at 1.1 M and 1.4 M rows; the
bridges at ~5 M and ~6 M; the materialised author profile at
~1.4 M. Every analytical query is one of: filter by venue id,
filter by year, filter by year range, group by year, group by
author id.

**Decision.** Beyond the system-default PK / FK indexes, add
composite covering indexes per query shape:

| Index | Backs |
|---|---|
| `fact_journal_articles (journal_id, year)` | journal yearly stats, journal articles list, year filter inside profiles |
| `fact_conference_articles (conference_id, year)` | conference equivalents |
| `bridge_journal_article_authors (author_id, article_id)` | author article list, materialised_author_profile build |
| `bridge_conference_article_authors (author_id, article_id)` | author article list (conferences) |
| `lookup_journals (best_subject_area)` and `lookup_journals (publisher)` | dropdown filters |
| `materialized_author_profile (total_articles DESC, author_name)` | authors browse default sort, no filesort |

**Consequences.**
- ✅ Every brief-mandatory query is an index-range scan, not a full
  table scan.
- ✅ `EXPLAIN` shows zero `Using filesort` for the default sort orders.
- ⚠️ Writes (one-shot ETL load) pay for the indexes. Acceptable
  trade: ETL runs once per dataset refresh, reads run millions of
  times.

---

## 6. FastAPI + Pydantic v2 (DTO, not ORM)

**Context.** Need an async HTTP framework that exposes a documented,
typed contract to a TypeScript client.

**Alternatives considered.**
- Flask (sync; ecosystem leans toward ORM).
- Starlette directly (loses Pydantic + OpenAPI for free).
- aiohttp (no built-in schema generation).

**Decision.** FastAPI with Pydantic v2 models for every request and
response DTO. `model_config = ConfigDict(from_attributes=True)` for
mapping cursor rows. No `.dict()`, always `.model_dump()`.

**Consequences.**
- ✅ `/openapi.json` is generated for free; the frontend's
  `src/api/types.ts` is a hand-typed mirror that we keep in sync.
- ✅ Validation errors automatically become RFC 7807 problem-details
  via custom exception handlers.
- ⚠️ Two parallel type systems (Pydantic + TS) — accepted because the
  cost of running an openapi-generator is more than the cost of one
  manual sync step per new DTO.

---

## 7. React 19 + Vite + TanStack stack

**Context.** The mandatory front-end surface is rich (13 routes, many
filters, three required chart families) but read-only and single-user.

**Alternatives considered.**
- Next.js (server-side rendering is overkill for this app).
- Angular / Vue (more boilerplate; project brief is JS-framework-agnostic).
- Plain HTML + Visx (no router, no caching).

**Decision.** React 19 + Vite 8 + TanStack Router (file-based) +
TanStack Query for server state.

**Consequences.**
- ✅ File-based routing keeps the route tree visible in the file tree.
- ✅ TanStack Query handles caching, deduplication and SWR with no
  custom code.
- ✅ Search params are typed and Zod-validated — filters live in the
  URL, every page state is shareable.
- ⚠️ React 19 + Vite 8 are recent; the team had to monitor compat
  patches during development.

---

## 8. Visx for charts

**Context.** Three chart families are required by the brief. We
extended to six for the playground.

**Alternatives considered.**
- Recharts (high-level API; no nearest-x hover; styling fights).
- Chart.js (Canvas, not SVG; harder to style + a11y).
- Plotly (heavy bundle, license).
- D3 directly (re-implements React reconciliation in imperative code).

**Decision.** Visx — D3 primitives wrapped as React components.

**Consequences.**
- ✅ Pixel-perfect control over axes, legends, tooltips, brush, clip
  paths and color scales.
- ✅ Each chart family is a small custom component; chains naturally
  with `ChartFrame` for caption + sizing.
- ✅ Drag-to-zoom, Voronoi nearest-x hover, click-to-toggle legend —
  implemented exactly the way the design wanted them.
- ⚠️ More component code per chart vs Recharts. Accepted because the
  charts are the centrepiece of the UI.

---

## 9. RFC 7807 problem-details for errors

**Decision.** Every error path emits `application/problem+json` with
`type / title / status / detail / instance`. Implemented with a
single custom exception handler in `api/errors.py`.

**Consequences.**
- ✅ Single, machine-readable error envelope.
- ✅ `ErrorCard` in the frontend reads `title` + `detail` + `status`
  and renders consistently regardless of which endpoint failed.

---

## 10. Tests at three layers

| Layer | Tool | Count | Needs DB | Needs frontend |
|---|---|---|---|---|
| Backend unit | pytest | minor | no | no |
| Backend integration | pytest + httpx + asyncmy | ~200 | yes (`mye030_test`) | no |
| Frontend unit + route | Vitest + Testing Library + MSW | ~160 | no | no |
| Frontend E2E | Playwright (chromium) | ~50 | yes | yes |

**Decision.** Integration tests assert hand-computed values against
a deterministic seed (`tests/integration/fixtures/seed.sql`). MSW
handlers mirror the Pydantic shapes so backend changes that break the
contract are caught early.

**Consequences.**
- ✅ End-to-end coverage of every public surface.
- ✅ ~95 % line coverage on the API package.
- ⚠️ The E2E suite needs both servers running — documented in
  `src/frontend/README.md`.

---

## 11. Dual delivery: production stack vs. development stack

**Context.** Reviewers want a one-command boot; developers want
hot-reload. These two needs pull in opposite directions.

**Decision.** Ship **two parallel run paths**:

- **Production (Path 0):** `python run.py` (or
  `docker compose up -d --wait` for the underlying command). The
  orchestrator at `run.py` auto-detects whether the gzipped backup
  is on disk, falls back to running the ETL inside the backend
  container when only raw CSVs are present, and prints a Drive-link
  banner when neither is available. It then builds three images
  (`mye030_mysql`, `mye030_backend`, `mye030_frontend`),
  brings them up with healthchecks and `depends_on` ordering. The
  frontend image is a multi-stage build that runs `vite build` and
  serves the minified bundle through nginx 1.27-alpine on port 80
  inside the container. Nginx also reverse-proxies `/api/*`,
  `/docs`, `/redoc`, `/openapi.json` and `/health` to the backend,
  so the whole product lives behind a single origin (no CORS
  configuration needed in production).

- **Development (Paths A/B/C):** host-installed Python + Node, with
  `uvicorn --reload` on the backend and `pnpm dev` (Vite dev
  server) on the frontend. Vite's dev server transpiles on demand,
  serves source maps and pushes HMR updates over a WebSocket.

**Consequences.**

- ✅ A first-time visitor can boot the whole product with one
  command and zero language-specific tooling installed.
- ✅ Developers keep their fast inner loop (Vite HMR, uvicorn
  `--reload`).
- ⚠️ Two parallel paths to maintain. Each is small (one Dockerfile
  per service), and they share the same code, so divergence is low.
- ⚠️ Host ports `5173` (frontend), `8000` (backend) and `3306`
  (MySQL) are the same in both modes by default — a stale `pnpm dev`
  can shadow the docker frontend. Mitigated by:
  - port variables in `.env` (`FRONTEND_PORT`, `BACKEND_PORT`,
    `MYSQL_PORT`) honoured by docker-compose,
  - a pre-flight port check in `scripts/setup.{ps1,sh}` that exits
    early with a clear message naming the offending process,
  - troubleshooting entries in `README.md`.

---

## 12. Documentation as code

Every behavioural or schema change updates the relevant docs in the
same commit:

| File | Updates when… |
|---|---|
| `README.md` | Anything user-facing (run paths, prerequisites, features) |
| `docs/API_REFERENCE.md` | Endpoint added / removed / signature changes |
| `docs/design.md` | Visual tokens change |
| `docs/ARCHITECTURE.md` (this file) | A new decision is made |
| `docs/GLOSSARY.md` | A new domain term appears in the UI / schema |
| `src/backend/README.md` | Backend layout or commands change |
| `src/frontend/README.md` | Frontend layout, components, route map change |
| `src/backend/api.http` | A new endpoint exists |
| `deliverables/report/chapters/*.tex` | Reportable architectural change |
| `docs/openapi.json` | Re-export when DTOs or routes change |
