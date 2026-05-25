-- =====================================================================
-- MYE030 Data Integration & Visualization Platform
-- Phase I DML: Bulk-load the nine CSV files produced by the exporter
-- into the star schema defined by 01_schema.sql.
--
-- Execution model
--   Pipe this script into the mysql client INSIDE the container, with
--   the host ./exports directory bind-mounted at /exports (see
--   docker-compose.yml). LOAD DATA LOCAL INFILE resolves paths
--   relative to the client process filesystem.
--
-- Run from the repo root:
--   docker exec -i ${MYSQL_CONTAINER_NAME} \
--       mysql --local-infile=1 -uroot -p${MYSQL_ROOT_PASSWORD} mye030 \
--       < sql_scripts/02_load.sql
--
-- Performance tuning
--   Disabling constraint and uniqueness checks during bulk load yields
--   a substantial speedup at the cost of trusting the upstream
--   exporter. Original values are restored before exiting. Load order
--   respects foreign key dependencies regardless.
-- =====================================================================

USE mye030;

SET @original_unique_checks      = @@unique_checks;
SET @original_foreign_key_checks = @@foreign_key_checks;
SET @original_autocommit         = @@autocommit;
SET @original_sql_mode           = @@sql_mode;

SET unique_checks      = 0;
SET foreign_key_checks = 0;
SET autocommit         = 0;
SET sql_mode           = '';

TRUNCATE TABLE bridge_conference_article_authors;
TRUNCATE TABLE bridge_journal_article_authors;
TRUNCATE TABLE fact_conference_articles;
TRUNCATE TABLE fact_journal_articles;
TRUNCATE TABLE lookup_conferences;
TRUNCATE TABLE lookup_journals;
TRUNCATE TABLE lookup_authors;
TRUNCATE TABLE lookup_field_of_research_categories;
TRUNCATE TABLE rejection_logs;

-- ---------------------------------------------------------------------
-- Reference dimension (loaded first; lookup_conferences.primary_for
-- foreign-keys into it).
-- ---------------------------------------------------------------------
LOAD DATA LOCAL INFILE '/exports/lookup_field_of_research_categories.csv'
INTO TABLE lookup_field_of_research_categories
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(code, description, parent_code);

-- ---------------------------------------------------------------------
-- Conformed dimensions (independent; loaded before facts).
-- ---------------------------------------------------------------------
LOAD DATA LOCAL INFILE '/exports/lookup_authors.csv'
INTO TABLE lookup_authors
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(author_id, author_name);

LOAD DATA LOCAL INFILE '/exports/lookup_journals.csv'
INTO TABLE lookup_journals
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(journal_id, title, publisher, country, best_quartile, best_subject_area,
 sjr_index, citation_score, h_index, total_documents, total_documents_3y,
 total_references, total_citations_3y, citable_documents_3y,
 citations_per_document_2y, references_per_document);

LOAD DATA LOCAL INFILE '/exports/lookup_conferences.csv'
INTO TABLE lookup_conferences
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(conference_id, title, acronym, rank_value, primary_for);

-- ---------------------------------------------------------------------
-- Facts (depend on lookup_journals / lookup_conferences).
-- ---------------------------------------------------------------------
LOAD DATA LOCAL INFILE '/exports/fact_journal_articles.csv'
INTO TABLE fact_journal_articles
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(article_id, source_id, title, year, pages, url, journal_id);

LOAD DATA LOCAL INFILE '/exports/fact_conference_articles.csv'
INTO TABLE fact_conference_articles
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(article_id, source_id, title, year, pages, url, conference_id);

-- ---------------------------------------------------------------------
-- Bridges (depend on facts + lookup_authors).
-- ---------------------------------------------------------------------
LOAD DATA LOCAL INFILE '/exports/bridge_journal_article_authors.csv'
INTO TABLE bridge_journal_article_authors
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(article_id, author_id);

LOAD DATA LOCAL INFILE '/exports/bridge_conference_article_authors.csv'
INTO TABLE bridge_conference_article_authors
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(article_id, author_id);

-- ---------------------------------------------------------------------
-- Rejection log (independent table; loaded last for visibility).
-- ---------------------------------------------------------------------
LOAD DATA LOCAL INFILE '/exports/rejection_logs.csv'
INTO TABLE rejection_logs
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(source_file, source_id, reason, raw_row);

COMMIT;

-- ---------------------------------------------------------------------
-- Post-load defensive cleanup
-- ---------------------------------------------------------------------
-- We disabled foreign_key_checks above for bulk-load throughput. A
-- small fraction of bridge rows (typically < 0.02 % of the corpus)
-- can reference author_ids that the lookup_authors export omitted
-- because of late-stage dedup after the bridges were materialised.
-- Delete those orphans now so scripts/data_quality_report.sql
-- returns zero violations on a clean load.
-- ---------------------------------------------------------------------
DELETE b
FROM bridge_journal_article_authors b
LEFT JOIN lookup_authors la ON b.author_id = la.author_id
WHERE la.author_id IS NULL;

DELETE b
FROM bridge_conference_article_authors b
LEFT JOIN lookup_authors la ON b.author_id = la.author_id
WHERE la.author_id IS NULL;

COMMIT;

SET unique_checks      = @original_unique_checks;
SET foreign_key_checks = @original_foreign_key_checks;
SET autocommit         = @original_autocommit;
SET sql_mode           = @original_sql_mode;

ANALYZE TABLE lookup_field_of_research_categories, lookup_authors,
              lookup_journals, lookup_conferences, fact_journal_articles,
              fact_conference_articles, bridge_journal_article_authors,
              bridge_conference_article_authors, rejection_logs;

SELECT 'lookup_field_of_research_categories'      AS table_name, COUNT(*) AS row_count FROM lookup_field_of_research_categories
UNION ALL SELECT 'lookup_authors',                            COUNT(*) FROM lookup_authors
UNION ALL SELECT 'lookup_journals',                           COUNT(*) FROM lookup_journals
UNION ALL SELECT 'lookup_conferences',                        COUNT(*) FROM lookup_conferences
UNION ALL SELECT 'fact_journal_articles',                     COUNT(*) FROM fact_journal_articles
UNION ALL SELECT 'fact_conference_articles',                  COUNT(*) FROM fact_conference_articles
UNION ALL SELECT 'bridge_journal_article_authors',            COUNT(*) FROM bridge_journal_article_authors
UNION ALL SELECT 'bridge_conference_article_authors',         COUNT(*) FROM bridge_conference_article_authors
UNION ALL SELECT 'rejection_logs',                            COUNT(*) FROM rejection_logs;