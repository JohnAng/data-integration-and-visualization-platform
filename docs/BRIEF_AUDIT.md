# Brief compliance audit

Line-by-line walkthrough of `documents/ProjectDescription-2025-2026.pdf`
mapped to the implementation. The audit is grouped the same way the
brief is. Each row carries a status flag:

- ✅ **Done** — implementation matches the brief verbatim.
- ⚠ **Partial / divergence** — covered but the brief asks for more
  parameterisation or a related variant we have not surfaced yet.
- ❌ **Missing** — explicit brief requirement that the implementation
  does not satisfy.
- 🎁 **Out of scope but available** — beyond brief but useful.

---

## Στόχος / Goal (page 5)

> Ο τελικός σκοπός σας είναι να μπορέσετε να υλοποιήσετε μία εφαρμογή
> ενοποίησης και οπτικής εξαγωγής συμπερασμάτων η οποία θα αξιοποιεί
> δεδομένα που θα έχουν ενσωματωθεί σε μια βάση δεδομένων.

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | Καθαρή και επερωτήσιμη βάση δεδομένων με τα φορτωμένα δεδομένα | ✅ | `sql_scripts/01_schema.sql` + `02_load.sql` + `03_views.sql` |
| 2 | Πληροφοριακό σύστημα με front-, back-end και ενδιάμεση λογική | ✅ | `src/backend/` (FastAPI + asyncmy) + `src/frontend/` (React) |
| 3 | Διαδραστική εφαρμογή για πλοήγηση στα δεδομένα | ✅ | `src/frontend/` — 13 routes |

## Συνέδριο / Περιοδικό

> Για οποιοδήποτε συνέδριο ή περιοδικό ο αναλυτής να μπορεί να δει το
> προφίλ του, τουτέστιν

| # | Requirement | Status | Where |
|---|---|---|---|
| 4 | Σχετικό ranking | ✅ | Journal: `best_quartile`, `sjr_index`, etc. on profile card. Conference: `rank_value`, `primary_for`. |
| 5 | Linecharts ανά χρονιά: πόσα άρθρα δημοσιεύτηκαν, συνολικό αρ. συγγραφέων, αρ. διακριτών συγγραφέων | ✅ | `routes/journals.$journalId.index.tsx` and `routes/conferences.$conferenceId.index.tsx` render a LineChart with three series: Articles, Distinct authors, Total authors |
| 6 | Στατιστικά: πρώτη/τελευταία γνωστή χρονιά | ✅ | Profile "Year span" field |
| 7 | Αρ. συγγραφέων που έχουν δημοσιεύσει | ✅ | Profile "Distinct authors" field |
| 8 | ΜΟ συγγραφέων ανά άρθρο (overall) | ✅ | Profile "Avg authors / article" field |
| 9 | ΜΟ συγγραφέων ανά άρθρο ανά χρονιά | ⚠ | Backend `JournalYearlyStatistic.average_authors_per_article` exposed by `/api/journals/{id}/yearly-statistics` but UI shows it only inside chart tooltips; not in a dedicated per-year table |
| 10 | Σύνολο άρθρων | ✅ | "Articles in corpus" field |
| 11 | ΜΟ άρθρων ανά χρονιά | ✅ | "Avg articles / year" field |
| 12 | Στατιστικά με φίλτρο για το εύρος χρονιών | ✅ | `YearRangeFilter` → search params drive `start_year` / `end_year` on profile + yearly + articles queries |
| 13 | Report όλων των άρθρων ως πινακάκι (φιλτραρισμένο με τις ίδιες χρονιές) | ✅ | Paginated articles table at the bottom of each profile page |

## Χρονιές

> Θέλουμε να μπορεί να δει ο αναλυτής:

| # | Requirement | Status | Where |
|---|---|---|---|
| 14 | Προφίλ μιας χρονιάς (πόσα άρθρα, σε πόσα διακριτά περιοδικά / συνέδρια, συγγραφείς συνολικά και διακριτά) | ✅ | `/years/$year`: four `MetricTile`s (Total, Journals, Conferences, Authors) plus the matching sub-counts |
| 15 | Σχετικές δημοσιεύσεις σαν πινακάκι | ✅ | Articles tab with `PaginatedTable<YearArticle>` |
| 16 | Φίλτρο για συνέδριο / περιοδικό / συγγραφέα | ✅ | Three numeric-id inputs above the articles table (commit `560d8d7`). UX could be improved with autocomplete pickers; functional today. |

## Συγγραφείς

| # | Requirement | Status | Where |
|---|---|---|---|
| 17 | Πρώτη / τελευταία γνωστή χρονιά | ✅ | Author profile metadata grid |
| 18 | Σύνολο άρθρων | ✅ | Metadata grid |
| 19 | ΜΟ άρθρων ανά χρονιά | ✅ | Metadata grid |
| 20 | LineChart με αρ. δημοσιευθέντων άρθρων ανά χρονιά (από συνέδρια και περιοδικά) | ✅ | `AuthorYearlyChart` |

## Στοχευμένες γραφικές παραστάσεις

### LineCharts

| # | Requirement | Status | Where |
|---|---|---|---|
| 21 | Με διαλεγμένα συνέδρια / περιοδικά: αρ. άρθρων **ή αρ. συγγραφέων ή …** ανά χρονιά, με φίλτρο χρονιών | ✅ | `/charts` → "Line · venue comparison" με Y-axis picker (`venue_y_metric`) πάνω από `articles_count` / `distinct_authors` / `total_authors` |
| 22 | Για κάθε κατηγορία PrimaryFoR / BestSubjectArea (με φίλτρο στην κατηγορία): **αρ. συνεδρίων / περιοδικών που εντάσσονται σε αυτή ανά χρονιά** | ✅ | `/charts` → "Line · subject area / FoR yearly" με Y-axis toggle (`series_y_metric`) ανάμεσα σε `articles_count` και `distinct_journals` / `distinct_conferences` |

### BarCharts

| # | Requirement | Status | Where |
|---|---|---|---|
| 23 | Για κάθε συνέδριο / περιοδικό: σύνολο άρθρων / ΜΟ άρθρων ανά χρονιά / ΜΟ συγγραφέων ανά χρονιά | ✅ | `/charts` → "Bar · venue metrics" renders all three grouped bars per venue |
| 24 | Για κάθε publisher περιοδικού: αριθμό περιοδικών που εκδίδει συνολικά | ✅ | `/charts` → "Bar · publisher quartile" suffixes κάθε X-axis label με το publisher total και αναφέρει το grand total στο caption |
| 25 | Για κάθε publisher: για κάθε quartile, αρ. περιοδικών (x = publisher, y = count, 4 series Q1-Q4) | ✅ | Same chart as #24 |

### ScatterPlots

| # | Requirement | Status | Where |
|---|---|---|---|
| 26 | Οποιαδήποτε δύο από TotalDocs / TotalDocs3y / TotalRefs / TotalCites3y / CitableDocs3y / Cites/Doc2y / Refs/Doc ... κάθε περιοδικό σημείο | ✅ | `/charts` → "Scatter · journal metrics" εκθέτει X/Y axis selectors (`scatter_x`, `scatter_y`) πάνω από τα 10 numeric metrics, με log/linear toggle per axis |
| 27 | ΜΟ συγγραφέων σε σχέση με #άρθρων ανά χρονιά, για συνέδρια ή περιοδικά | ✅ | `/charts` → "Scatter · authors vs articles" with venue_type toggle |

---

## Phase I — ETL & schema (page 6)

| # | Requirement | Status | Where |
|---|---|---|---|
| 28 | Lookup tables με σωστά πρωτεύοντα κλειδιά | ✅ | `lookup_authors`, `lookup_journals`, `lookup_conferences`, `lookup_field_of_research_categories` |
| 29 | Factual tables με ορθά PK + FKs στους lookup πίνακες | ✅ | `fact_journal_articles`, `fact_conference_articles` |
| 30 | Συγγραφείς σε λίστες ενωμένες με `|` → N:M bridge | ✅ | `bridge_journal_article_authors`, `bridge_conference_article_authors` |
| 31 | Άρθρα σε περιοδικά και συνέδρια έχουν παρόμοια αλλά όχι ίδια δομή (booktitle vs journal). Tradeoff? | ✅ | Two separate fact tables to preserve the schema difference. Trade-off documented in README "Stack & design decisions". |
| 32 | Άλλο ΆρθροΣεΠεριοδικό και άλλο Περιοδικό | ✅ | Separate `fact_journal_articles` vs `lookup_journals` |
| 33 | Invalid rows / NULL handling — pre-load isolation | ✅ | `transformer.py` writes a `rejection_logs` CSV; `02_load.sql` loads it into the `rejection_logs` table. Auditable counts surface through `scripts/data_quality_report.sql` (section C) |
| 34 | Τι κάνετε με τους πίνακες αξιολογήσεων; (separate from facts or one?) | ✅ | Wide dimensions: rankings stored inside the lookup tables themselves (one column per metric), not a separate `rankings` fact. Trade-off explained inline in `sql_scripts/01_schema.sql` |
| 35 | Υποψήφιοι lookup tables: PrimaryFoR, BestSubjectArea ... | ✅ | `lookup_field_of_research_categories`. BestSubjectArea kept as a column in `lookup_journals` because it never normalises into a useful dimension |
| 36 | Non-matching values: regex για match journals (DBLP abbreviated vs Kaggle full) | ✅ | `transformer.py`: NFKD normalisation + token expansion dictionary + rapidfuzz token_set_ratio at threshold 85 |
| 37 | Non-string primary keys | ✅ | Every table uses `INT AUTO_INCREMENT` or `INT NOT NULL` integer keys |

> Στόχοι obligatorios (κόκκινο box στη σελ. 6):
> - Lookup Tables with correct lookup values and primary keys ✅
> - Database holding single-version-of-the-truth factual tables with PKs / FKs ✅
> - Clean, validate, transform before load ✅

## Phase I — Operational steps (page 6)

| # | Step | Status |
|---|---|---|
| 38 | Στήσιμο βάσης + γραφικό εργαλείο (Workbench / DataGrip) | ✅ Docker compose + README documents DataGrip + Workbench |
| 39 | Download data | ✅ `data/` (gitignored) |
| 40 | Δημιουργία σχήματος, InnoDB | ✅ `01_schema.sql`, every table `ENGINE = InnoDB` |
| 41 | Scripts μετατροπής input → load-ready files | ✅ `etl/transformer.py` + `etl/exporter.py` |
| 42 | Scripts φόρτωσης (LOAD DATA INFILE) | ✅ `02_load.sql` |
| 43 | Φόρτωση + backup | ✅ `database/db_backup.py` + `database/db_restore.py` |

## Phase II — Application core (page 7)

| # | Step | Status |
|---|---|---|
| 44 | Setup of programming environment | ✅ `pyproject.toml` (uv), `package.json` (pnpm) |
| 45 | Setup of execution environment | ✅ `docker-compose.yml` |
| 46 | Experimentation with sample programs from technology docs | ✅ commit history shows incremental scaffolding |
| 47 | Code that accesses the database | ✅ `api/data_access/*.py` DAOs with raw parameterised SQL |
| 48 | Code that visualizes data | ✅ `src/frontend/` |
| 49 | Progressive connection between the layers | ✅ TanStack Query hooks bind UI → API → MySQL |
| 50 | Back-end data processing INSIDE the DBMS (όχι «στη μνήμη του κώδικα») | ✅ Heavy aggregates in `03_views.sql` (11 views + 6 materialised tables); DAOs query with WHERE / WITH clauses |

## Phase III — Finalisation (page 8)

| # | Step | Status |
|---|---|---|
| 51 | Πλήρης γκάμα από ερωτήσεις και οπτικοποιήσεις | ✅ 13 routes covering every checklist item |
| 52 | Μενού επιλογής (ή άλλους τρόπους) | ✅ Navbar with 6 entries + page-level breadcrumbs |
| 53 | Φόρμες / dropdowns | ✅ `SelectFilter`, `SearchInput`, `YearRangeFilter`, tabs |
| 54 | Σύνδεση interaction με queries / visualizations | ✅ Every filter wires to a TanStack Query key |

## Project Checklist (page 9 verbatim)

| Checkbox | Status |
|---|---|
| Repeatability — Scripts ETL | ✅ `02_load.sql` |
| Repeatability — Scripts DDL | ✅ `01_schema.sql` |
| Repeatability — Backup of the DB | ✅ `database/db_backup.py` |
| Σχήμα — Εξηγήστε σχεδίαση + trade-offs | ✅ README "Stack & design decisions" + view comments |
| Σχήμα — PKs / FKs | ✅ `01_schema.sql` |
| Σχήμα — Σχέδιο για ερωτήσεις | ✅ `03_views.sql` + `docs/API_REFERENCE.md` |
| Front end — Conf/Journal Profile | ✅ |
| Front end — Conf/Journal Filtered profile | ✅ |
| Front end — Conf/Journal Paper details | ✅ |
| Front end — Years Profile | ✅ |
| Front end — Years Details | ✅ |
| Front end — Years Filtered details | ✅ (after `560d8d7`) |
| Front end — Authors Profile | ✅ |
| Front end — Authors Annual stats | ✅ |
| Charts — LineCharts | ✅ |
| Charts — BarCharts | ✅ |
| Charts — Scatterplots | ✅ |
| Παραδοτέα — Git repo with code | ✅ |
| Παραδοτέα — Report (PDF) | ✅ `deliverables/AM2403_projectReport.pdf` (32 σελίδες) |
| Παραδοτέα — Video | ❌ Pending |
| Παραδοτέα — Turnin text file | ✅ `deliverables/AM2403_prj.txt` |

---

## Summary of gaps

### Brief-defined gaps (closed)

1. ✅ **#22** — LineChart subject area / FoR Y-axis toggle between `articles_count` and `distinct_journals` / `distinct_conferences` is now in the sidebar (`series_y_metric` search param).
2. ✅ **#26** — Scatter "journal metrics" exposes X / Y axis selectors over all 10 numeric metrics returned by `/api/charts/journal-metrics` (`scatter_x`, `scatter_y` search params).
3. ✅ **#21** — LineChart venue comparison Y-axis picker over `articles_count` / `distinct_authors` / `total_authors` (`venue_y_metric` search param).
4. ✅ **#24** — Publisher bar chart now suffixes each X-axis label with the publisher's total journals and surfaces the grand total in the chart caption.

### Brief-defined nice-to-haves (still open)

1. **#9** — Per-year `average_authors_per_article` could appear in a tiny supplementary table on the profile page, not only inside chart tooltips.

### UX gaps (not in brief, but noticed in the audit)

- `/years/$year` filters take numeric IDs; replace with name autocomplete pickers.
- `/charts` "venue comparison" / "venue metrics" expect comma-separated IDs; same fix.
- A global Cmd+K palette would smooth navigation across the 1.4M-author corpus (deferred).

### Deliverables outstanding

- PDF report (`deliverables/AM1_AM2_AM3_projectReport.pdf`).
- ~15 min demo video (or external link from `deliverables/`).
- Turnin text file `AM1_AM2_AM3_prj.txt`.
