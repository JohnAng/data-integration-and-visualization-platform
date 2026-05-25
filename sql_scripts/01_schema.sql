-- =====================================================================
-- MYE030 Data Integration & Visualization Platform
-- Phase I DDL: Star schema (wide Kimball-style) for bibliographic data.
--
-- Sources integrated:
--   * DBLP (input_article.csv, input_inproceedings.csv) -> facts + authors
--   * Kaggle journal rankings -> lookup_journals metric columns
--   * iCore26 conference rankings -> lookup_conferences metric columns
--
-- Naming convention
--   * snake_case lowercase for every identifier.
--   * Role prefix (lookup_, fact_, bridge_) preserved from the brief's
--     star-schema terminology.
--   * No abbreviations: conf_id -> conference_id, total_docs ->
--     total_documents, etc. Two-letter year-window suffixes (3y, 2y)
--     are retained as established bibliometric notation.
--
-- Design decisions
--   * Wide dimensions, no over-normalization (publisher and subject area
--     remain attributes, not separate lookup tables).
--   * Conformed lookup_authors dimension shared by both fact tables.
--   * Surrogate INT UNSIGNED PKs; source_id retained on facts for data
--     lineage back to DBLP.
--   * utf8mb4 / utf8mb4_unicode_ci everywhere; international names load
--     without mojibake.
--   * InnoDB + ROW_FORMAT=DYNAMIC for efficient variable-length storage.
--   * rejection_logs captures rows that failed ETL pre-validation.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS mye030
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE mye030;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS bridge_conference_article_authors;
DROP TABLE IF EXISTS bridge_journal_article_authors;
DROP TABLE IF EXISTS fact_conference_articles;
DROP TABLE IF EXISTS fact_journal_articles;
DROP TABLE IF EXISTS lookup_conferences;
DROP TABLE IF EXISTS lookup_journals;
DROP TABLE IF EXISTS lookup_authors;
DROP TABLE IF EXISTS lookup_field_of_research_categories;
DROP TABLE IF EXISTS rejection_logs;

-- ---------------------------------------------------------------------
-- lookup_field_of_research_categories
-- Human-readable descriptions for the Field of Research codes used by
-- iCore26, sourced from icoreCategories.xlsx. Self-referential
-- parent_code captures the two-level hierarchy (e.g. 460101 maps to
-- parent 4601). The special 'CSE' row represents Computer Systems
-- Engineering as a cross-cutting category.
-- ---------------------------------------------------------------------
CREATE TABLE lookup_field_of_research_categories (
    code         VARCHAR(10)  NOT NULL,
    description  VARCHAR(255) NOT NULL,
    parent_code  VARCHAR(10)  NULL,
    PRIMARY KEY (code),
    KEY index_field_of_research_category_parent_code (parent_code),
    CONSTRAINT fk_field_of_research_category_parent
        FOREIGN KEY (parent_code)
        REFERENCES lookup_field_of_research_categories (code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Field of Research code to description map from icoreCategories.xlsx.';

-- ---------------------------------------------------------------------
-- lookup_authors: conformed dimension shared by both fact tables.
-- The ekfonisi treats author names as synonym-free.
-- ---------------------------------------------------------------------
CREATE TABLE lookup_authors (
    author_id    INT UNSIGNED NOT NULL,
    author_name  VARCHAR(255) NOT NULL,
    PRIMARY KEY (author_id),
    UNIQUE KEY unique_author_name (author_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Distinct authors extracted from the DBLP author fields.';

-- ---------------------------------------------------------------------
-- lookup_journals: wide journal dimension. Metric columns originate
-- from the Kaggle ranking source and are populated through fuzzy
-- entity resolution during ETL.
-- ---------------------------------------------------------------------
CREATE TABLE lookup_journals (
    journal_id                          INT UNSIGNED NOT NULL,
    title                               VARCHAR(500) NOT NULL,
    publisher                           VARCHAR(255) NULL,
    country                             VARCHAR(100) NULL,
    best_quartile                       VARCHAR(2)   NULL,
    best_subject_area                   VARCHAR(100) NULL,
    sjr_index                           DECIMAL(10,3) NULL,
    citation_score                      DECIMAL(10,2) NULL,
    h_index                             SMALLINT UNSIGNED NULL,
    total_documents                     INT UNSIGNED NULL,
    total_documents_3y                  INT UNSIGNED NULL,
    total_references                    INT UNSIGNED NULL,
    total_citations_3y                  INT UNSIGNED NULL,
    citable_documents_3y                INT UNSIGNED NULL,
    citations_per_document_2y           DECIMAL(10,2) NULL,
    references_per_document             DECIMAL(10,2) NULL,
    PRIMARY KEY (journal_id),
    UNIQUE KEY unique_journal_title (title),
    KEY index_journal_publisher (publisher),
    KEY index_journal_subject_area (best_subject_area),
    KEY index_journal_quartile (best_quartile),
    KEY index_journal_country (country)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Journal dimension enriched from Kaggle SJR rankings via fuzzy matching.';

-- ---------------------------------------------------------------------
-- lookup_conferences: wide conference dimension. acronym, rank_value
-- and primary_for are enriched from iCore26 via acronym + fuzzy match.
-- ---------------------------------------------------------------------
CREATE TABLE lookup_conferences (
    conference_id   INT UNSIGNED NOT NULL,
    title           VARCHAR(500) NOT NULL,
    acronym         VARCHAR(50)  NULL,
    rank_value      VARCHAR(50)  NULL,
    primary_for     VARCHAR(10)  NULL,
    PRIMARY KEY (conference_id),
    UNIQUE KEY unique_conference_title (title),
    KEY index_conference_acronym (acronym),
    KEY index_conference_rank (rank_value),
    KEY index_conference_primary_for (primary_for),
    CONSTRAINT fk_conference_primary_for
        FOREIGN KEY (primary_for)
        REFERENCES lookup_field_of_research_categories (code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Conference dimension enriched from the iCore26 source.';

-- ---------------------------------------------------------------------
-- fact_journal_articles: one row per DBLP journal article.
-- source_id (original DBLP id) is retained for lineage / debugging.
-- ---------------------------------------------------------------------
CREATE TABLE fact_journal_articles (
    article_id  INT UNSIGNED NOT NULL,
    source_id   VARCHAR(50)  NULL,
    title       VARCHAR(500) NOT NULL,
    year        SMALLINT UNSIGNED NULL,
    pages       VARCHAR(100) NULL,
    url         VARCHAR(500) NULL,
    journal_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (article_id),
    CONSTRAINT fk_fact_journal_article_journal
        FOREIGN KEY (journal_id) REFERENCES lookup_journals (journal_id),
    KEY index_fact_journal_article_year (year),
    KEY index_fact_journal_article_journal_year (journal_id, year),
    KEY index_fact_journal_article_source_id (source_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Journal article facts. Each row belongs to exactly one journal.';

-- ---------------------------------------------------------------------
-- fact_conference_articles: one row per DBLP conference paper.
-- ---------------------------------------------------------------------
CREATE TABLE fact_conference_articles (
    article_id      INT UNSIGNED NOT NULL,
    source_id       VARCHAR(50)  NULL,
    title           VARCHAR(500) NOT NULL,
    year            SMALLINT UNSIGNED NULL,
    pages           VARCHAR(100) NULL,
    url             VARCHAR(500) NULL,
    conference_id   INT UNSIGNED NOT NULL,
    PRIMARY KEY (article_id),
    CONSTRAINT fk_fact_conference_article_conference
        FOREIGN KEY (conference_id) REFERENCES lookup_conferences (conference_id),
    KEY index_fact_conference_article_year (year),
    KEY index_fact_conference_article_conference_year (conference_id, year),
    KEY index_fact_conference_article_source_id (source_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Conference article facts. Each row belongs to exactly one conference.';

-- ---------------------------------------------------------------------
-- bridge_journal_article_authors: many-to-many resolution between
-- journal articles and authors. Reverse index supports per-author
-- queries without a full table scan.
-- ---------------------------------------------------------------------
CREATE TABLE bridge_journal_article_authors (
    article_id  INT UNSIGNED NOT NULL,
    author_id   INT UNSIGNED NOT NULL,
    PRIMARY KEY (article_id, author_id),
    CONSTRAINT fk_bridge_journal_article_author_article
        FOREIGN KEY (article_id) REFERENCES fact_journal_articles (article_id),
    CONSTRAINT fk_bridge_journal_article_author_author
        FOREIGN KEY (author_id) REFERENCES lookup_authors (author_id),
    KEY index_bridge_journal_article_author_author (author_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Many-to-many bridge between journal articles and their authors.';

-- ---------------------------------------------------------------------
-- bridge_conference_article_authors: many-to-many for conference papers.
-- ---------------------------------------------------------------------
CREATE TABLE bridge_conference_article_authors (
    article_id  INT UNSIGNED NOT NULL,
    author_id   INT UNSIGNED NOT NULL,
    PRIMARY KEY (article_id, author_id),
    CONSTRAINT fk_bridge_conference_article_author_article
        FOREIGN KEY (article_id) REFERENCES fact_conference_articles (article_id),
    CONSTRAINT fk_bridge_conference_article_author_author
        FOREIGN KEY (author_id) REFERENCES lookup_authors (author_id),
    KEY index_bridge_conference_article_author_author (author_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Many-to-many bridge between conference articles and their authors.';

-- ---------------------------------------------------------------------
-- rejection_logs: quarantine for rows dropped by ETL pre-validation.
-- Captures the source file, optional source identifier, a structured
-- reason, and the raw row as JSON for forensic inspection.
-- ---------------------------------------------------------------------
CREATE TABLE rejection_logs (
    rejection_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_file   VARCHAR(100) NOT NULL,
    source_id     VARCHAR(100) NULL,
    reason        VARCHAR(255) NOT NULL,
    raw_row       JSON         NULL,
    ingested_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rejection_id),
    KEY index_rejection_log_source_file (source_file),
    KEY index_rejection_log_reason (reason)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC
  COMMENT='Quarantine for ETL-rejected rows. Loaded by 02_load.sql.';

SET FOREIGN_KEY_CHECKS = 1;