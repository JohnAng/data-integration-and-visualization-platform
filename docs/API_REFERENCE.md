# HTTP API reference

Base URL: `http://localhost:8000` when the API runs locally.

All endpoints return `application/json` on success and
`application/problem+json` ([RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807))
on failure. The full live OpenAPI document lives at `/openapi.json`; an
interactive Swagger UI is at `/docs` and a Redoc view at `/redoc`.

## Conventions

- **Pagination**: list endpoints return a `PaginatedResponse[T]` envelope:
  ```json
  { "items": [...], "page": 1, "page_size": 50, "total_items": 234 }
  ```
  `page` is 1-based. `page_size` is capped server-side at 200 per request and
  10 000 per response. Use `?format=csv` (where supported) for full exports.
- **Year filters**: every endpoint that accepts `start_year` / `end_year`
  applies an inclusive range filter and validates the values are inside
  `[1900, 2100]`.
- **Errors**: 404 means the resource id does not exist. 422 means the request
  failed validation (the `detail` field names the offending parameter). 500
  means an unexpected exception bubbled out of a handler.

---

## Meta

### `GET /health`

Liveness probe; returns `{"status": "ok"}`. Used by orchestrators and uptime
monitors.

### `GET /openapi.json` · `GET /docs` · `GET /redoc`

Auto-generated OpenAPI document and two human-friendly UIs over it.

### `GET /api/meta/totals`

Single-row corpus summary that powers the landing page and the dashboard
KPI tiles. Every count is computed by the `view_corpus_totals` view in
MySQL.

Response: `CorpusTotalsResponse` — `total_articles`,
`total_journal_articles`, `total_conference_articles`, `total_authors`,
`total_journals`, `total_conferences`, `earliest_year`, `latest_year`.

`earliest_year` and `latest_year` may be null on an empty database.

### `GET /api/meta/options`

Feeds every filter dropdown in the frontend so the client does not have
to re-derive enumerable values. Returned options are pre-filtered to
those that actually have at least one matching row, so checkboxes never
expose empty selections.

Response: `FilterOptionsResponse` —
- `subject_areas: list[str]` — sorted alphabetically
- `publishers: list[PublisherOption]` — `(publisher, journal_count)`
- `field_of_research_codes: list[FieldOfResearchOption]` —
  `(code, description, conference_count)`
- `conference_ranks: list[str]` — natural order `A*`, `A`, `B`, `C`, `Multiconference`

---

## Journals

### `GET /api/journals`

List journals with optional filters and pagination.

| Query param | Type | Notes |
|---|---|---|
| `page` | int | 1-based page number (default 1) |
| `page_size` | int | 1-200 (default 50) |
| `search_text` | string | Substring match on `title` |
| `publisher` | string | Exact match |
| `best_quartile` | string | One of `Q1`, `Q2`, `Q3`, `Q4` |
| `best_subject_area` | string | Exact match |
| `ranked_only` | bool | Set to `true` to hide journals without a Kaggle quartile (default `false`) |

Response items: `JournalSummary`
(`journal_id`, `title`, `publisher`, `best_quartile`, `best_subject_area`,
`sjr_index`).

About 20 % of indexed journals carry no Kaggle ranking (`publisher`,
`best_quartile`, etc. are `null`). They appear in the default response;
use `ranked_only=true` for a clean dataset. The lookup table holds
1 423 journals; 1 141 have a Kaggle match.

### `GET /api/journals/{journal_id}`

Full profile for one journal.

| Query param | Type | Notes |
|---|---|---|
| `start_year` | int | Optional; recomputes every aggregate inside the range |
| `end_year` | int | Optional; recomputes every aggregate inside the range |

Response: `JournalProfile` — every Kaggle ranking column plus the aggregates
`total_articles`, `earliest_year`, `latest_year`, `distinct_authors_total`,
`average_articles_per_year`, `average_authors_per_article_overall`.

### `GET /api/journals/{journal_id}/yearly-statistics`

Per-year aggregates used by the line chart on the journal profile page.

| Query param | Type |
|---|---|
| `start_year` | int |
| `end_year` | int |

Response: `list[JournalYearlyStatistic]` —
(`year`, `articles_count`, `distinct_authors`, `total_authors`,
`average_authors_per_article`). Total ≥ distinct because total counts each
authorship and distinct counts each unique person.

### `GET /api/journals/{journal_id}/articles`

Paginated articles inside one journal.

| Query param | Type |
|---|---|
| `page`, `page_size` | int |
| `start_year`, `end_year` | int |

Response items: `JournalArticle` —
(`article_id`, `title`, `year`, `pages`, `url`).

### `GET /api/journals/{journal_id}/articles/{article_id}`

Full paper details including the entire author list.

Response: `PaperDetails` — article fields plus
`venue_type` (`journal` or `conference`), `venue_id`, `venue_title`, and
`authors: list[PaperAuthor]`.

---

## Conferences

### `GET /api/conferences`

List conferences with optional filters and pagination.

| Query param | Type | Notes |
|---|---|---|
| `page`, `page_size` | int | Standard pagination |
| `search_text` | string | Matches `title` or `acronym` |
| `rank_value` | string | e.g. `A*`, `A`, `B`, `C`, `Multiconference` |
| `primary_for` | string | iCore Field of Research code (e.g. `4605`) |
| `ranked_only` | bool | Set to `true` to hide conferences not in iCore26 (default `false`) |

About 81 % of indexed conferences carry no iCore26 ranking; iCore26
only covers ~944 acronyms while DBLP exposes 5 566 booktitles (1 059
match). Use `ranked_only=true` to restrict to ranked conferences.

Response items: `ConferenceSummary`
(`conference_id`, `title`, `acronym`, `rank_value`, `primary_for`,
`primary_for_description`).

### `GET /api/conferences/{conference_id}`

Profile of one conference, with optional year-range recomputation.

| Query param | Type |
|---|---|
| `start_year`, `end_year` | int |

Response: `ConferenceProfile` — identification, rank info, FoR description,
plus the same aggregate metrics as journals.

### `GET /api/conferences/{conference_id}/yearly-statistics`

Per-year aggregates for the line chart.

### `GET /api/conferences/{conference_id}/articles`

Paginated articles inside one conference.

### `GET /api/conferences/{conference_id}/articles/{article_id}`

Paper details with the full author list.

---

## Years

### `GET /api/years`

Year summary timeseries.

| Query param | Type |
|---|---|
| `start_year`, `end_year` | int |

Response: `list[YearSummary]` —
(`year`, `journal_articles`, `conference_articles`, `total_articles`,
`distinct_journals`, `distinct_conferences`, `distinct_authors`,
`total_authors`).

### `GET /api/years/{year}`

Single year profile. 404 if the year has no published articles.

### `GET /api/years/{year}/articles`

Every article published in the year, optionally filtered by venue or author.

| Query param | Type |
|---|---|
| `page`, `page_size` | int |
| `conference_id` | int — if set, only conference articles for that venue |
| `journal_id` | int — if set, only journal articles for that venue |
| `author_id` | int — restricts to that author across both venues |

Response items: `YearArticle` —
(`article_id`, `title`, `venue_type`, `venue_id`, `venue_title`, `pages`, `url`).

### `GET /api/years/{year}/journals`

Journals that published at least one article in the given year, sorted by
article count descending.

Response items: `YearJournalEntry` (extends `JournalSummary` with
`articles_in_year`).

### `GET /api/years/{year}/conferences`

Same shape for conferences. Items: `YearConferenceEntry`.

---

## Authors

### `GET /api/authors`

Paginated author search (no other filters because the lookup table is large).

| Query param | Type |
|---|---|
| `page`, `page_size` | int |
| `name_query` | string — substring matched against `author_name` |

Response items: `AuthorSummary` — (`author_id`, `author_name`).

### `GET /api/authors/{author_id}`

Author profile. Returns first/last year, total articles, average per year.

### `GET /api/authors/{author_id}/yearly-statistics`

Per-year article count for the line chart.

### `GET /api/authors/{author_id}/articles`

Paginated list of every article authored, across both fact tables.

| Query param | Type |
|---|---|
| `page`, `page_size` | int |
| `start_year`, `end_year` | int |

Response items: `AuthorArticle` —
(`article_id`, `title`, `year`, `venue_type`, `venue_title`).

---

## Charts

Seven endpoints feed the visualization components.

### `GET /api/charts/publisher-quartile-distribution`

For the publisher bar chart. No parameters.

Response items: `PublisherQuartileEntry` —
(`publisher`, `best_quartile`, `journal_count`). Group by publisher in the UI
to obtain four bars (Q1–Q4) per publisher.

### `GET /api/charts/subject-area-yearly-summary`

For the journal line chart per subject area.

| Query param | Type |
|---|---|
| `best_subject_area` | string |
| `start_year`, `end_year` | int |

Response items: `SubjectAreaYearlyEntry` —
(`best_subject_area`, `year`, `distinct_journals`, `articles_count`).

### `GET /api/charts/field-of-research-yearly-summary`

For the conference line chart per Field of Research.

| Query param | Type |
|---|---|
| `primary_for` | string |
| `start_year`, `end_year` | int |

Response items: `FieldOfResearchYearlyEntry` —
(`primary_for`, `primary_for_description`, `year`, `distinct_conferences`,
`articles_count`).

### `GET /api/charts/venue-comparison`

For the multi-venue line chart (Με τη χρήση πολλαπλών συνεδρίων/περιοδικών).

| Query param | Type | Notes |
|---|---|---|
| `venue_type` | string | `journal` or `conference` |
| `venue_ids` | int[] | 1-20 venue ids, repeat the param: `?venue_ids=1&venue_ids=2` |
| `start_year`, `end_year` | int | |

Response items: `VenueComparisonPoint` —
(`venue_id`, `venue_title`, `year`, `articles_count`, `distinct_authors`,
`total_authors`). Group by `venue_id` in the UI to obtain one series per venue.

### `GET /api/charts/venue-metrics`

For the multi-venue bar chart.

| Query param | Type |
|---|---|
| `venue_type` | string |
| `venue_ids` | int[] |

Response items: `VenueMetricsPoint` —
(`venue_id`, `venue_title`, `total_articles`, `average_articles_per_year`,
`average_distinct_authors_per_year`).

### `GET /api/charts/authors-vs-articles-scatter`

For the scatter plot pairing the venue's average articles per year with its
average authors per article.

| Query param | Type | Notes |
|---|---|---|
| `venue_type` | string | `journal` or `conference` |
| `maximum_points` | int | 1-10 000; default 5000 |

Response items: `AuthorsVsArticlesPoint` —
(`venue_id`, `venue_title`, `rank_or_quartile`,
`average_articles_per_year`, `average_authors_per_article_overall`,
`total_articles`).

### `GET /api/charts/journal-metrics`

For the journal-metrics scatter (any two of TotalDocs, TotalRefs, CiteScore, …).

| Query param | Type |
|---|---|
| `best_subject_area` | string |
| `best_quartile` | `Q1`-`Q4` |
| `maximum_points` | int |

Response items: `JournalMetricPoint` — every numeric ranking metric exposed by
`lookup_journals` plus identification (`journal_id`, `title`). The UI picks
any two columns for X / Y axes.

---

## Error responses

Every error returns `application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Journal 99999 not found",
  "instance": "http://localhost:8000/api/journals/99999"
}
```

| HTTP status | Title | Triggered by |
|---|---|---|
| 400 | Bad Request | Malformed request body |
| 404 | Not Found | Unknown id in path |
| 422 | Request validation failed | Query parameter fails Pydantic validation |
| 500 | Internal Server Error | Uncaught exception (logged server-side) |

---

## Try it interactively

Open `src/backend/api.http` in PyCharm or VS Code (REST Client extension). Each
block is a runnable request: click the green arrow, see the response in a side
pane. Coverage includes every endpoint above plus three intentional error
paths.

---

## Performance notes

Every endpoint listed above responds in under one second against the
full corpus (2.5 M articles, 1.4 M authors). Where a view computed
millions of `COUNT(DISTINCT)` rows on each request the result is
materialised at the end of `sql_scripts/03_views.sql` as a real InnoDB
table:

| Endpoint | View | Materialised table | Before | After |
|---|---|---|---|---|
| `/api/meta/totals` | `view_corpus_totals` | computed at request (cheap after MIN/MAX fix) | 22.4 s | 0.84 s |
| `/api/years` | `view_year_summary` | `materialized_year_summary` | 11.0 s | 0.24 s |
| `/api/authors/{id}` | `view_author_profile` | inlined SQL with predicate pushdown | 17.5 s | 0.25 s |
| `/api/charts/subject-area-yearly-summary` | `view_subject_area_yearly_summary` | `materialized_subject_area_yearly_summary` | 7.6 s | 0.25 s |
| `/api/charts/field-of-research-yearly-summary` | `view_field_of_research_yearly_summary` | `materialized_field_of_research_yearly_summary` | 10.2 s | 0.24 s |
| `/api/charts/authors-vs-articles-scatter` | `view_journal_profile` / `view_conference_profile` | `materialized_authors_vs_articles_scatter_*` | 46.2 s | 0.26 s |

The views themselves remain in `03_views.sql` for documentation and
ad-hoc queries; the DAOs read from the materialised snapshots. The
trade-off is that the snapshots are populated at script-load time and
are read-only until the next `03_views.sql` run — which is the
correct pattern for a static post-ETL data warehouse.
