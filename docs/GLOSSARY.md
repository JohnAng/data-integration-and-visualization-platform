# Glossary

Domain terms that appear in the data, the schema or the UI and may not
be immediately obvious to a non-specialist reader.

## Bibliographic sources

**DBLP.** The Digital Bibliography & Library Project — a computer
science bibliography from the University of Trier, indexing journals,
conferences, books and other publications since 1993. Source for the
two `fact_*_articles` tables. Site: <https://dblp.org>.

**Scimago / SJR.** Scimago Journal Rank — a journal-level prestige
metric based on the eigenvector centrality of citations, weighted by
the citing journals' own SJR. Higher is better, no upper bound.
Backed by Elsevier Scopus data. We obtain SJR plus eight more metrics
per journal from a Kaggle dump.

**iCore / CORE2026.** The Computing Research and Education Association
of Australasia (CORE) maintains a public ranking of computing
conferences. Tiers run `A*`, `A`, `B`, `C` and `Multiconference` from
top to bottom. Site: <http://portal.core.edu.au/conf-ranks/>.

**Kaggle.** Public dataset platform. The Scimago dump we ingest was
published there: *"Journal Rankings"* by Khaled-El-Sayed.

## Schema patterns

**Lookup table.** A dimension table that contains the conformed,
unique entities of one type. Example: `lookup_journals` is the
single-version-of-truth for the 1 423 journals in the corpus.

**Fact table.** A table whose rows represent individual events or
measurements at the lowest grain of analysis. Example:
`fact_journal_articles` — one row per article ever published in any
indexed journal.

**Bridge table.** Resolves an N-to-N relationship between a fact row
and a dimension. `bridge_journal_article_authors` connects an article
to each of its authors with a composite primary key.

**Star schema.** Kimball dimensional model: a small number of fact
tables surrounded by dimension/lookup tables. The opposite of a
snowflake schema (further normalisation of dimensions). Optimised for
analytical reads.

**Wide dimension.** A dimension table that absorbs the *attributes* of
the entity it represents — even if some attributes are sparsely
populated — rather than splitting them across normalised sub-tables.
Trade-off: faster reads, slightly larger per-row storage.

**Materialised table.** A regular `CREATE TABLE` whose contents are
populated from a `SELECT` over views. Acts as a cached snapshot of an
expensive aggregate. Read-only between rebuilds. The pattern used
throughout `sql_scripts/03_views.sql` for the heavy aggregates.

**Rejection log.** Quarantine table for rows that fail validation
during ETL. Captures source file, source id, reason and the raw row
as JSON, so failures are visible and recoverable.

## Ranking metrics (in `lookup_journals`)

**Best quartile.** Categorical `Q1` – `Q4` ranking of the journal
relative to all journals in its `best_subject_area`. `Q1` = top 25 %.

**Best subject area.** The subject category where the journal has its
strongest position (highest quartile). Each journal can appear in
several subject areas; the "best" is what the UI uses.

**H-index.** The largest integer *h* such that the journal has
published at least *h* papers cited *h* or more times. Resists
single-paper outliers; favours sustained productivity.

**Cite score.** Average citations per article over the last 4 years.

**Total docs / total docs 3y.** Number of indexed documents
ever / in the last 3 years.

**Total refs.** Total references contained in articles published in
the journal.

**Total cites 3y.** Total citations the journal received in the last
3 years.

**Citable docs 3y.** Documents counted as citable in the 3-year
window (research articles, reviews; excludes editorials, errata, etc.).

**Cites per doc 2y.** Citations per article in the last 2 years —
the building block of Journal Impact Factor.

**Refs per doc.** Average reference count per article. Higher in
review-heavy journals.

## Ranking metrics (in `lookup_conferences`)

**Acronym.** The short form (e.g. `EDBT`, `VLDB`) used by DBLP as
`booktitle`. Acronym → iCore is the strict entity-resolution edge.

**Rank value.** The iCore tier (`A*` to `Multiconference`).

**Primary FoR.** Australian *Field of Research* code that classifies
the conference's topic. The code is opaque (e.g. `4605`) but each one
has a human description (e.g. *"Distributed and parallel computing"*).
The `lookup_field_of_research_categories` table maps codes to
descriptions.

## API and front-end concepts

**RFC 7807 Problem Details.** Standard JSON shape for HTTP error
responses (`application/problem+json`). Fields: `type`, `title`,
`status`, `detail`, `instance`. Used by every error path of the API.

**Stale-while-revalidate (SWR).** Caching strategy where a stale cache
entry is served immediately while the fetch refreshes it in the
background. TanStack Query implements this with `staleTime` and
`gcTime`.

**Visx.** Airbnb's collection of low-level visualisation primitives
that wrap D3 scales, shapes and axes as React components. Trade-off
vs Recharts/Chart.js: more code to write, but pixel-perfect control.

**Voronoi nearest-x overlay.** Hover-detection layer that maps each
mouse position to the nearest data point in X without forcing the
cursor onto a tiny marker. Implemented in `LineChart.tsx`.

**Drag-to-zoom.** Brush interaction where dragging across the X axis
selects a new view window. Implemented client-side; the data array is
sliced, not re-fetched.

**Path / search params.** TanStack Router treats route parameters
(e.g. `$journalId`) and URL search parameters (`?start_year=…`) as
typed, schema-validated inputs. Filters live in the URL, so every
page state is shareable.
