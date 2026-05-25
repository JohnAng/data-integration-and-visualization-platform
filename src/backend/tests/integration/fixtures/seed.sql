-- =====================================================================
-- Deterministic fixture seed for integration tests.
-- Loaded after 01_schema.sql against mye030_test.
-- Every aggregate the integration tests assert is computable by hand
-- from the rows below; see test docstrings for the worked-out values.
-- =====================================================================

USE mye030_test;

SET foreign_key_checks = 0;
TRUNCATE TABLE bridge_conference_article_authors;
TRUNCATE TABLE bridge_journal_article_authors;
TRUNCATE TABLE fact_conference_articles;
TRUNCATE TABLE fact_journal_articles;
TRUNCATE TABLE lookup_conferences;
TRUNCATE TABLE lookup_journals;
TRUNCATE TABLE lookup_authors;
TRUNCATE TABLE lookup_field_of_research_categories;
TRUNCATE TABLE rejection_logs;
SET foreign_key_checks = 1;

INSERT INTO lookup_field_of_research_categories (code, description, parent_code) VALUES
    ('4601', 'Applied computing', NULL),
    ('4605', 'Data management and data science', NULL);

INSERT INTO lookup_authors (author_id, author_name) VALUES
    (1, 'Alice'),
    (2, 'Bob'),
    (3, 'Charlie'),
    (4, 'Diana'),
    (5, 'Eve');

INSERT INTO lookup_journals (
    journal_id, title, publisher, country, best_quartile, best_subject_area,
    sjr_index, citation_score, h_index, total_documents, total_documents_3y,
    total_references, total_citations_3y, citable_documents_3y,
    citations_per_document_2y, references_per_document
) VALUES
    (1, 'Test Journal A', 'Publisher X', 'USA', 'Q1', 'Computer Science',
     1.500, 5.00, 50, 100, 30, 200, 50, 25, 2.00, 6.60),
    (2, 'Test Journal B', 'Publisher X', 'UK', 'Q2', 'Computer Science',
     0.800, 3.00, 30, 80, 25, 150, 40, 20, 1.50, 5.00),
    (3, 'Test Journal C', 'Publisher Y', 'DE', 'Q3', 'Engineering',
     0.400, 1.50, 20, 50, 15, 100, 25, 10, 1.00, 4.00);

INSERT INTO lookup_conferences (
    conference_id, title, acronym, rank_value, primary_for
) VALUES
    (1, 'International Conference on Data Engineering', 'ICDE', 'A*', '4605'),
    (2, 'Very Large Data Bases', 'VLDB', 'A*', '4605'),
    (3, 'Local Workshop', 'LW', NULL, NULL);

INSERT INTO fact_journal_articles (
    article_id, source_id, title, year, pages, url, journal_id
) VALUES
    (1, 'src001', 'Paper A1', 2020, '1-10',  'http://x/a1', 1),
    (2, 'src002', 'Paper A2', 2021, '11-20', 'http://x/a2', 1),
    (3, 'src003', 'Paper B1', 2020, '1-10',  'http://x/b1', 2),
    (4, 'src004', 'Paper C1', 2022, '1-10',  'http://x/c1', 3);

INSERT INTO fact_conference_articles (
    article_id, source_id, title, year, pages, url, conference_id
) VALUES
    (1, 'src101', 'ICDE Paper 1',  2020, '1-10',  'http://x/c1', 1),
    (2, 'src102', 'ICDE Paper 2',  2021, '11-20', 'http://x/c2', 1),
    (3, 'src103', 'VLDB Paper 1',  2022, '21-30', 'http://x/c3', 2),
    (4, 'src104', 'Local Paper',   2020, '1-10',  'http://x/c4', 3);

INSERT INTO bridge_journal_article_authors (article_id, author_id) VALUES
    (1, 1), (1, 2),
    (2, 1), (2, 3),
    (3, 2), (3, 3), (3, 4),
    (4, 5);

INSERT INTO bridge_conference_article_authors (article_id, author_id) VALUES
    (1, 1), (1, 2), (1, 3),
    (2, 4),
    (3, 1), (3, 5),
    (4, 2);
