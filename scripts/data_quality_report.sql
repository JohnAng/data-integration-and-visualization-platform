-- =====================================================================
-- MYE030 — data quality report
-- =====================================================================
-- Runs a fixed set of audit queries against the loaded mye030 database
-- and prints a single, readable summary. This is the canonical source
-- for every "X % of journals were matched against Kaggle" claim in
-- the report; the percentages are not hand-rolled, they come from
-- this script.
--
-- Usage (from repo root, container must be up):
--     docker exec -i mye030_mysql mysql -uroot -proot mye030 \
--         < scripts/data_quality_report.sql
--
-- Or via the gzipped backup of a fresh boot:
--     docker compose up -d
--     ... wait until healthy ...
--     docker exec -i mye030_mysql mysql -uroot -proot mye030 \
--         < scripts/data_quality_report.sql
-- =====================================================================

USE mye030;

-- ---------------------------------------------------------------------
-- Section A: row counts per table
-- ---------------------------------------------------------------------
SELECT '== A. Row counts per table ==' AS report_section;

SELECT 'lookup_authors'                          AS table_name, COUNT(*) AS row_count FROM lookup_authors
UNION ALL SELECT 'lookup_journals',                              COUNT(*) FROM lookup_journals
UNION ALL SELECT 'lookup_conferences',                           COUNT(*) FROM lookup_conferences
UNION ALL SELECT 'lookup_field_of_research_categories',          COUNT(*) FROM lookup_field_of_research_categories
UNION ALL SELECT 'fact_journal_articles',                        COUNT(*) FROM fact_journal_articles
UNION ALL SELECT 'fact_conference_articles',                     COUNT(*) FROM fact_conference_articles
UNION ALL SELECT 'bridge_journal_article_authors',               COUNT(*) FROM bridge_journal_article_authors
UNION ALL SELECT 'bridge_conference_article_authors',            COUNT(*) FROM bridge_conference_article_authors
UNION ALL SELECT 'rejection_logs',                               COUNT(*) FROM rejection_logs;

-- ---------------------------------------------------------------------
-- Section B: entity resolution match rates
-- ---------------------------------------------------------------------
-- "Match" = the lookup row carries a non-null ranking column populated
-- from the external dataset (Kaggle for journals, iCore for
-- conferences). A non-matched row exists in DBLP but has no
-- counterpart in the ranking source.
-- ---------------------------------------------------------------------
SELECT '== B. Entity resolution match rates ==' AS report_section;

SELECT
    'journals'                                                AS entity,
    COUNT(*)                                                  AS total_lookup_rows,
    SUM(best_quartile IS NOT NULL)                            AS matched_rows,
    ROUND(100.0 * SUM(best_quartile IS NOT NULL) / COUNT(*), 1) AS match_pct
FROM lookup_journals
UNION ALL
SELECT
    'conferences',
    COUNT(*),
    SUM(rank_value IS NOT NULL),
    ROUND(100.0 * SUM(rank_value IS NOT NULL) / COUNT(*), 1)
FROM lookup_conferences;

-- ---------------------------------------------------------------------
-- Section C: rejection log breakdown by reason
-- ---------------------------------------------------------------------
-- Every row that failed ETL validation lives here with its reason and
-- raw JSON payload. Non-empty totals are expected and intentional;
-- they prove that no input was silently dropped.
-- ---------------------------------------------------------------------
SELECT '== C. Rejection log breakdown ==' AS report_section;

SELECT
    reason,
    COUNT(*) AS rejected_rows
FROM rejection_logs
GROUP BY reason
ORDER BY rejected_rows DESC;

-- ---------------------------------------------------------------------
-- Section D: orphan / integrity checks
-- ---------------------------------------------------------------------
-- These should all return 0. Anything > 0 is a load-time bug.
-- ---------------------------------------------------------------------
SELECT '== D. Orphan / integrity checks (all should be 0) ==' AS report_section;

SELECT
    'journal_articles_without_journal'         AS check_name,
    COUNT(*)                                    AS violations
FROM fact_journal_articles fa
LEFT JOIN lookup_journals lj ON fa.journal_id = lj.journal_id
WHERE lj.journal_id IS NULL
UNION ALL
SELECT 'conference_articles_without_conference',
       COUNT(*)
FROM fact_conference_articles fa
LEFT JOIN lookup_conferences lc ON fa.conference_id = lc.conference_id
WHERE lc.conference_id IS NULL
UNION ALL
SELECT 'bridge_journal_authors_without_article',
       COUNT(*)
FROM bridge_journal_article_authors b
LEFT JOIN fact_journal_articles fa ON b.article_id = fa.article_id
WHERE fa.article_id IS NULL
UNION ALL
SELECT 'bridge_conference_authors_without_article',
       COUNT(*)
FROM bridge_conference_article_authors b
LEFT JOIN fact_conference_articles fa ON b.article_id = fa.article_id
WHERE fa.article_id IS NULL
UNION ALL
SELECT 'bridge_journal_authors_without_author',
       COUNT(*)
FROM bridge_journal_article_authors b
LEFT JOIN lookup_authors la ON b.author_id = la.author_id
WHERE la.author_id IS NULL
UNION ALL
SELECT 'bridge_conference_authors_without_author',
       COUNT(*)
FROM bridge_conference_article_authors b
LEFT JOIN lookup_authors la ON b.author_id = la.author_id
WHERE la.author_id IS NULL
UNION ALL
SELECT 'journal_articles_with_null_title',
       COUNT(*)
FROM fact_journal_articles WHERE title IS NULL
UNION ALL
SELECT 'conference_articles_with_null_title',
       COUNT(*)
FROM fact_conference_articles WHERE title IS NULL
UNION ALL
SELECT 'journals_with_null_title',
       COUNT(*)
FROM lookup_journals WHERE title IS NULL
UNION ALL
SELECT 'conferences_with_null_title',
       COUNT(*)
FROM lookup_conferences WHERE title IS NULL;

-- ---------------------------------------------------------------------
-- Section E: corpus span
-- ---------------------------------------------------------------------
SELECT '== E. Corpus span ==' AS report_section;

SELECT * FROM view_corpus_totals;

-- ---------------------------------------------------------------------
-- Section F: distinct cardinalities backing the dropdowns
-- ---------------------------------------------------------------------
SELECT '== F. Distinct cardinalities (filter dropdowns) ==' AS report_section;

SELECT 'subject_areas'  AS dimension, COUNT(DISTINCT best_subject_area) AS distinct_values
FROM lookup_journals WHERE best_subject_area IS NOT NULL
UNION ALL SELECT 'publishers',        COUNT(DISTINCT publisher)
FROM lookup_journals WHERE publisher IS NOT NULL
UNION ALL SELECT 'fields_of_research', COUNT(DISTINCT primary_for)
FROM lookup_conferences WHERE primary_for IS NOT NULL
UNION ALL SELECT 'conference_ranks',   COUNT(DISTINCT rank_value)
FROM lookup_conferences WHERE rank_value IS NOT NULL;
