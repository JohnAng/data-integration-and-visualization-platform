-- =====================================================================
-- MYE030 Data Integration & Visualization Platform
-- Phase II analytical views.
--
-- Each view captures one un-parameterized aggregation that the backend
-- DAOs read directly or extend with a WHERE clause, so heavy analytical
-- work happens inside the database as required by the brief. Views are
-- defined in dependency order (referenced tables already exist).
--
-- Run from the repo root after a successful 02_load.sql:
--   docker exec -i ${MYSQL_CONTAINER_NAME} \
--       mysql -uroot -p${MYSQL_ROOT_PASSWORD} mye030 \
--       < sql_scripts/03_views.sql
-- =====================================================================

USE mye030;

DROP VIEW IF EXISTS view_corpus_totals;
DROP VIEW IF EXISTS view_field_of_research_yearly_summary;
DROP VIEW IF EXISTS view_subject_area_yearly_summary;
DROP VIEW IF EXISTS view_publisher_quartile_distribution;
DROP VIEW IF EXISTS view_author_yearly_statistics;
DROP VIEW IF EXISTS view_author_profile;
DROP VIEW IF EXISTS view_year_summary;
DROP VIEW IF EXISTS view_conference_yearly_statistics;
DROP VIEW IF EXISTS view_conference_profile;
DROP VIEW IF EXISTS view_journal_yearly_statistics;
DROP VIEW IF EXISTS view_journal_profile;

-- ---------------------------------------------------------------------
-- view_journal_profile
-- One row per journal with totals and span across all of its articles.
-- Powers the journal profile page: ranking columns from kaggle, plus
-- aggregate statistics computed against the fact and bridge tables.
-- ---------------------------------------------------------------------
CREATE VIEW view_journal_profile AS
SELECT
    journal.journal_id,
    journal.title,
    journal.publisher,
    journal.country,
    journal.best_quartile,
    journal.best_subject_area,
    journal.sjr_index,
    journal.citation_score,
    journal.h_index,
    journal.total_documents,
    journal.total_documents_3y,
    journal.total_references,
    journal.total_citations_3y,
    journal.citable_documents_3y,
    journal.citations_per_document_2y,
    journal.references_per_document,
    COUNT(DISTINCT article.article_id)                      AS total_articles,
    MIN(article.year)                                       AS earliest_year,
    MAX(article.year)                                       AS latest_year,
    COUNT(DISTINCT bridge.author_id)                        AS distinct_authors_total,
    ROUND(
        COUNT(DISTINCT article.article_id)
        / NULLIF(MAX(article.year) - MIN(article.year) + 1, 0),
        2
    )                                                       AS average_articles_per_year,
    ROUND(
        COUNT(bridge.author_id)
        / NULLIF(COUNT(DISTINCT article.article_id), 0),
        2
    )                                                       AS average_authors_per_article_overall
FROM lookup_journals AS journal
LEFT JOIN fact_journal_articles AS article
    ON article.journal_id = journal.journal_id
LEFT JOIN bridge_journal_article_authors AS bridge
    ON bridge.article_id = article.article_id
GROUP BY
    journal.journal_id;

-- ---------------------------------------------------------------------
-- view_journal_yearly_statistics
-- One row per (journal, year). Powers the journal line chart and any
-- per-year aggregations the analyst requests.
-- ---------------------------------------------------------------------
CREATE VIEW view_journal_yearly_statistics AS
SELECT
    article.journal_id,
    article.year,
    COUNT(DISTINCT article.article_id)                          AS articles_count,
    COUNT(DISTINCT bridge.author_id)                            AS distinct_authors,
    COUNT(bridge.author_id)                                     AS total_authors,
    ROUND(
        COUNT(bridge.author_id)
        / NULLIF(COUNT(DISTINCT article.article_id), 0),
        2
    )                                                            AS average_authors_per_article
FROM fact_journal_articles AS article
LEFT JOIN bridge_journal_article_authors AS bridge
    ON bridge.article_id = article.article_id
WHERE article.year IS NOT NULL
GROUP BY
    article.journal_id,
    article.year;

-- ---------------------------------------------------------------------
-- view_conference_profile
-- Mirror of view_journal_profile for conferences. Joins to
-- lookup_field_of_research_categories so the analyst sees a human-readable
-- description for the primary Field of Research code.
-- ---------------------------------------------------------------------
CREATE VIEW view_conference_profile AS
SELECT
    conference.conference_id,
    conference.title,
    conference.acronym,
    conference.rank_value,
    conference.primary_for,
    field_of_research.description                           AS primary_for_description,
    COUNT(DISTINCT article.article_id)                      AS total_articles,
    MIN(article.year)                                       AS earliest_year,
    MAX(article.year)                                       AS latest_year,
    COUNT(DISTINCT bridge.author_id)                        AS distinct_authors_total,
    ROUND(
        COUNT(DISTINCT article.article_id)
        / NULLIF(MAX(article.year) - MIN(article.year) + 1, 0),
        2
    )                                                       AS average_articles_per_year,
    ROUND(
        COUNT(bridge.author_id)
        / NULLIF(COUNT(DISTINCT article.article_id), 0),
        2
    )                                                       AS average_authors_per_article_overall
FROM lookup_conferences AS conference
LEFT JOIN fact_conference_articles AS article
    ON article.conference_id = conference.conference_id
LEFT JOIN bridge_conference_article_authors AS bridge
    ON bridge.article_id = article.article_id
LEFT JOIN lookup_field_of_research_categories AS field_of_research
    ON field_of_research.code = conference.primary_for
GROUP BY
    conference.conference_id,
    field_of_research.description;

-- ---------------------------------------------------------------------
-- view_conference_yearly_statistics
-- One row per (conference, year). Powers the conference line chart.
-- ---------------------------------------------------------------------
CREATE VIEW view_conference_yearly_statistics AS
SELECT
    article.conference_id,
    article.year,
    COUNT(DISTINCT article.article_id)                          AS articles_count,
    COUNT(DISTINCT bridge.author_id)                            AS distinct_authors,
    COUNT(bridge.author_id)                                     AS total_authors,
    ROUND(
        COUNT(bridge.author_id)
        / NULLIF(COUNT(DISTINCT article.article_id), 0),
        2
    )                                                            AS average_authors_per_article
FROM fact_conference_articles AS article
LEFT JOIN bridge_conference_article_authors AS bridge
    ON bridge.article_id = article.article_id
WHERE article.year IS NOT NULL
GROUP BY
    article.conference_id,
    article.year;

-- ---------------------------------------------------------------------
-- view_year_summary
-- One row per publication year aggregating across BOTH journal and
-- conference articles. Internal UNION ALL collects rows from each fact
-- table together with their author bridge entries.
-- ---------------------------------------------------------------------
CREATE VIEW view_year_summary AS
SELECT
    yearly_data.year,
    COUNT(DISTINCT yearly_data.journal_article_id)              AS journal_articles,
    COUNT(DISTINCT yearly_data.conference_article_id)           AS conference_articles,
    (
        COUNT(DISTINCT yearly_data.journal_article_id)
        + COUNT(DISTINCT yearly_data.conference_article_id)
    )                                                            AS total_articles,
    COUNT(DISTINCT yearly_data.journal_id)                       AS distinct_journals,
    COUNT(DISTINCT yearly_data.conference_id)                    AS distinct_conferences,
    COUNT(DISTINCT yearly_data.author_id)                        AS distinct_authors,
    COUNT(yearly_data.author_id)                                 AS total_authors
FROM (
    SELECT
        article.year,
        article.article_id     AS journal_article_id,
        NULL                   AS conference_article_id,
        article.journal_id     AS journal_id,
        NULL                   AS conference_id,
        bridge.author_id       AS author_id
    FROM fact_journal_articles AS article
    LEFT JOIN bridge_journal_article_authors AS bridge
        ON bridge.article_id = article.article_id
    WHERE article.year IS NOT NULL
    UNION ALL
    SELECT
        article.year,
        NULL                   AS journal_article_id,
        article.article_id     AS conference_article_id,
        NULL                   AS journal_id,
        article.conference_id  AS conference_id,
        bridge.author_id       AS author_id
    FROM fact_conference_articles AS article
    LEFT JOIN bridge_conference_article_authors AS bridge
        ON bridge.article_id = article.article_id
    WHERE article.year IS NOT NULL
) AS yearly_data
GROUP BY
    yearly_data.year;

-- ---------------------------------------------------------------------
-- view_author_profile
-- One row per author with total articles across both fact tables and
-- the span of years across which the author has published.
-- ---------------------------------------------------------------------
CREATE VIEW view_author_profile AS
SELECT
    author.author_id,
    author.author_name,
    COUNT(contributions.article_id)                         AS total_articles,
    MIN(contributions.year)                                  AS earliest_year,
    MAX(contributions.year)                                  AS latest_year,
    ROUND(
        COUNT(contributions.article_id)
        / NULLIF(MAX(contributions.year) - MIN(contributions.year) + 1, 0),
        2
    )                                                        AS average_articles_per_year
FROM lookup_authors AS author
LEFT JOIN (
    SELECT
        bridge.author_id,
        article.article_id,
        'journal'             AS venue_type,
        article.year
    FROM bridge_journal_article_authors AS bridge
    JOIN fact_journal_articles AS article
        ON article.article_id = bridge.article_id
    UNION ALL
    SELECT
        bridge.author_id,
        article.article_id,
        'conference'          AS venue_type,
        article.year
    FROM bridge_conference_article_authors AS bridge
    JOIN fact_conference_articles AS article
        ON article.article_id = bridge.article_id
) AS contributions
    ON contributions.author_id = author.author_id
GROUP BY
    author.author_id;

-- ---------------------------------------------------------------------
-- view_author_yearly_statistics
-- One row per (author, year). Drives the author line chart of papers
-- published per year.
-- ---------------------------------------------------------------------
CREATE VIEW view_author_yearly_statistics AS
SELECT
    contributions.author_id,
    contributions.year,
    COUNT(*)                                                 AS articles_count
FROM (
    SELECT
        bridge.author_id,
        article.year
    FROM bridge_journal_article_authors AS bridge
    JOIN fact_journal_articles AS article
        ON article.article_id = bridge.article_id
    WHERE article.year IS NOT NULL
    UNION ALL
    SELECT
        bridge.author_id,
        article.year
    FROM bridge_conference_article_authors AS bridge
    JOIN fact_conference_articles AS article
        ON article.article_id = bridge.article_id
    WHERE article.year IS NOT NULL
) AS contributions
GROUP BY
    contributions.author_id,
    contributions.year;

-- ---------------------------------------------------------------------
-- view_publisher_quartile_distribution
-- One row per (publisher, quartile) pair with the count of journals
-- that publisher carries inside that quartile. Powers the bar chart.
-- ---------------------------------------------------------------------
CREATE VIEW view_publisher_quartile_distribution AS
SELECT
    publisher,
    best_quartile,
    COUNT(*) AS journal_count
FROM lookup_journals
WHERE publisher IS NOT NULL
GROUP BY
    publisher,
    best_quartile;

-- ---------------------------------------------------------------------
-- view_subject_area_yearly_summary
-- Powers the line chart of journal output per Kaggle BestSubjectArea
-- per year.
-- ---------------------------------------------------------------------
CREATE VIEW view_subject_area_yearly_summary AS
SELECT
    journal.best_subject_area,
    article.year,
    COUNT(DISTINCT article.journal_id)                      AS distinct_journals,
    COUNT(DISTINCT article.article_id)                      AS articles_count
FROM fact_journal_articles AS article
JOIN lookup_journals AS journal
    ON journal.journal_id = article.journal_id
WHERE article.year IS NOT NULL
  AND journal.best_subject_area IS NOT NULL
GROUP BY
    journal.best_subject_area,
    article.year;

-- ---------------------------------------------------------------------
-- view_field_of_research_yearly_summary
-- Powers the line chart of conference output per Field of Research per
-- year. The FoR human-readable description is exposed alongside the
-- code so the UI can label series directly.
-- ---------------------------------------------------------------------
CREATE VIEW view_field_of_research_yearly_summary AS
SELECT
    conference.primary_for,
    field_of_research.description                           AS primary_for_description,
    article.year,
    COUNT(DISTINCT article.conference_id)                   AS distinct_conferences,
    COUNT(DISTINCT article.article_id)                      AS articles_count
FROM fact_conference_articles AS article
JOIN lookup_conferences AS conference
    ON conference.conference_id = article.conference_id
LEFT JOIN lookup_field_of_research_categories AS field_of_research
    ON field_of_research.code = conference.primary_for
WHERE article.year IS NOT NULL
  AND conference.primary_for IS NOT NULL
GROUP BY
    conference.primary_for,
    field_of_research.description,
    article.year;

-- ---------------------------------------------------------------------
-- view_corpus_totals
-- Single-row summary of the entire dataset, used by the landing page
-- and the dashboard for the headline KPI tiles. Every count is computed
-- in MySQL so the front-end stays a thin rendering layer.
--
-- Performance note: earliest_year and latest_year resolve straight
-- through index_fact_journal_article_year and
-- index_fact_conference_article_year via LEAST / GREATEST around four
-- index-only MIN / MAX scans. Routing through view_year_summary would
-- force MySQL to materialize that heavy UNION + GROUP BY twice (once
-- per subquery), which on the full corpus takes seconds and eats
-- temp-table RAM. Counts stay as direct table scans against the
-- smallest covering index on each table.
-- ---------------------------------------------------------------------
CREATE VIEW view_corpus_totals AS
SELECT
    (SELECT COUNT(*) FROM fact_journal_articles)                       AS total_journal_articles,
    (SELECT COUNT(*) FROM fact_conference_articles)                    AS total_conference_articles,
    (SELECT COUNT(*) FROM fact_journal_articles)
        + (SELECT COUNT(*) FROM fact_conference_articles)              AS total_articles,
    (SELECT COUNT(*) FROM lookup_authors)                              AS total_authors,
    (SELECT COUNT(*) FROM lookup_journals)                             AS total_journals,
    (SELECT COUNT(*) FROM lookup_conferences)                          AS total_conferences,
    LEAST(
        (SELECT MIN(year) FROM fact_journal_articles    WHERE year IS NOT NULL),
        (SELECT MIN(year) FROM fact_conference_articles WHERE year IS NOT NULL)
    )                                                                  AS earliest_year,
    GREATEST(
        (SELECT MAX(year) FROM fact_journal_articles    WHERE year IS NOT NULL),
        (SELECT MAX(year) FROM fact_conference_articles WHERE year IS NOT NULL)
    )                                                                  AS latest_year;

-- =====================================================================
-- Materialised snapshots
--
-- The year summary view computes six COUNT(DISTINCT) aggregations over
-- the de-normalised join of every fact_*_articles table with its
-- matching bridge_*_authors table, which on the full corpus expands to
-- roughly 8 million temp-table rows and takes about ten seconds per
-- request. The data is static after the ETL load, so we follow standard
-- data warehouse practice: compute once, store as a physical table,
-- read from there. DAOs and tests target the materialised table; the
-- view above stays for documentation and ad-hoc queries.
-- =====================================================================

DROP TABLE IF EXISTS materialized_author_profile;
DROP TABLE IF EXISTS materialized_authors_vs_articles_scatter_conferences;
DROP TABLE IF EXISTS materialized_authors_vs_articles_scatter_journals;
DROP TABLE IF EXISTS materialized_field_of_research_yearly_summary;
DROP TABLE IF EXISTS materialized_subject_area_yearly_summary;
DROP TABLE IF EXISTS materialized_year_summary;
CREATE TABLE materialized_year_summary (
    year                 SMALLINT     NOT NULL,
    journal_articles     INT UNSIGNED NOT NULL,
    conference_articles  INT UNSIGNED NOT NULL,
    total_articles       INT UNSIGNED NOT NULL,
    distinct_journals    INT UNSIGNED NOT NULL,
    distinct_conferences INT UNSIGNED NOT NULL,
    distinct_authors     INT UNSIGNED NOT NULL,
    total_authors        INT UNSIGNED NOT NULL,
    PRIMARY KEY (year)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO materialized_year_summary
SELECT
    year,
    journal_articles,
    conference_articles,
    total_articles,
    distinct_journals,
    distinct_conferences,
    distinct_authors,
    total_authors
FROM view_year_summary;

-- ---------------------------------------------------------------------
-- materialized_subject_area_yearly_summary
-- Pre-computed counts per (best_subject_area, year) for the subject area
-- line chart. The underlying view performs a COUNT(DISTINCT) over a 1M
-- row fact_journal_articles join, which costs ~8s per request. The
-- materialised snapshot collapses that to a tens-of-row lookup.
-- ---------------------------------------------------------------------
CREATE TABLE materialized_subject_area_yearly_summary (
    best_subject_area   VARCHAR(255) NOT NULL,
    year                SMALLINT     NOT NULL,
    distinct_journals   INT UNSIGNED NOT NULL,
    articles_count      INT UNSIGNED NOT NULL,
    PRIMARY KEY (best_subject_area, year),
    KEY index_msays_year (year)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO materialized_subject_area_yearly_summary
SELECT best_subject_area, year, distinct_journals, articles_count
FROM view_subject_area_yearly_summary;

-- ---------------------------------------------------------------------
-- materialized_field_of_research_yearly_summary
-- Pre-computed counts per (primary_for, year) for the Field of Research
-- line chart. Same rationale as the subject area snapshot above; the
-- view runs a COUNT(DISTINCT) over fact_conference_articles plus a join
-- against the descriptions table.
-- ---------------------------------------------------------------------
CREATE TABLE materialized_field_of_research_yearly_summary (
    primary_for             VARCHAR(40)  NOT NULL,
    primary_for_description VARCHAR(255) NULL,
    year                    SMALLINT     NOT NULL,
    distinct_conferences    INT UNSIGNED NOT NULL,
    articles_count          INT UNSIGNED NOT NULL,
    PRIMARY KEY (primary_for, year),
    KEY index_mforys_year (year)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO materialized_field_of_research_yearly_summary
SELECT primary_for, primary_for_description, year, distinct_conferences, articles_count
FROM view_field_of_research_yearly_summary;

-- ---------------------------------------------------------------------
-- materialized_authors_vs_articles_scatter_journals
-- materialized_authors_vs_articles_scatter_conferences
-- One row per venue with the columns the scatter plot needs. Reading
-- view_journal_profile / view_conference_profile for ALL venues forces
-- MySQL to expand the full bridge x fact join for every venue at once
-- (46s on the conference side). Pre-computing snapshots collapses
-- this to an indexed table scan.
-- ---------------------------------------------------------------------
CREATE TABLE materialized_authors_vs_articles_scatter_journals (
    venue_id                            INT          NOT NULL,
    venue_title                         VARCHAR(255) NOT NULL,
    rank_or_quartile                    VARCHAR(8)   NULL,
    average_articles_per_year           DECIMAL(10, 2) NULL,
    average_authors_per_article_overall DECIMAL(10, 2) NULL,
    total_articles                      INT UNSIGNED NOT NULL,
    PRIMARY KEY (venue_id),
    KEY index_mavasj_total (total_articles)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO materialized_authors_vs_articles_scatter_journals
SELECT journal_id, title, best_quartile,
       average_articles_per_year, average_authors_per_article_overall,
       total_articles
FROM view_journal_profile
WHERE average_articles_per_year IS NOT NULL
  AND average_authors_per_article_overall IS NOT NULL;

CREATE TABLE materialized_authors_vs_articles_scatter_conferences (
    venue_id                            INT          NOT NULL,
    venue_title                         VARCHAR(255) NOT NULL,
    rank_or_quartile                    VARCHAR(64)  NULL,
    average_articles_per_year           DECIMAL(10, 2) NULL,
    average_authors_per_article_overall DECIMAL(10, 2) NULL,
    total_articles                      INT UNSIGNED NOT NULL,
    PRIMARY KEY (venue_id),
    KEY index_mavasc_total (total_articles)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO materialized_authors_vs_articles_scatter_conferences
SELECT conference_id, title, rank_value,
       average_articles_per_year, average_authors_per_article_overall,
       total_articles
FROM view_conference_profile
WHERE average_articles_per_year IS NOT NULL
  AND average_authors_per_article_overall IS NOT NULL;

-- ---------------------------------------------------------------------
-- materialized_author_profile
-- One row per author with publication totals and year span. Reading
-- view_author_profile on every list request is a 1.4M-author scan
-- over millions of bridge rows and takes seconds per page. The data is
-- static after ETL load, so we follow the same warehouse pattern as
-- the other materialised tables: compute once, store, read fast.
-- ---------------------------------------------------------------------
CREATE TABLE materialized_author_profile (
    author_id                 INT UNSIGNED NOT NULL,
    author_name               VARCHAR(255) NOT NULL,
    total_articles            INT UNSIGNED NOT NULL,
    earliest_year             SMALLINT     NULL,
    latest_year               SMALLINT     NULL,
    average_articles_per_year DECIMAL(8,2) NULL,
    PRIMARY KEY (author_id),
    KEY index_map_name (author_name),
    KEY index_map_total_articles (total_articles),
    KEY index_map_total_name (total_articles, author_name)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE = utf8mb4_unicode_ci;

INSERT INTO materialized_author_profile
SELECT author_id, author_name, total_articles,
       earliest_year, latest_year, average_articles_per_year
FROM view_author_profile;
