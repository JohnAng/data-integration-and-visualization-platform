/**
 * Hand-written TypeScript mirrors of the Pydantic response schemas under
 * src/backend/api/schemas/. Kept in one file so the entire API surface
 * is greppable in one place. When the backend schema changes, update
 * the matching interface here.
 *
 * Reference: docs/API_REFERENCE.md.
 */

export type VenueType = "journal" | "conference";

export type Quartile = "Q1" | "Q2" | "Q3" | "Q4";

export type ConferenceRank = "A*" | "A" | "B" | "C" | "Multiconference";

export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
}

export interface PaginatedResponse<ItemType> {
    items: ItemType[];
    page: number;
    page_size: number;
    total_items: number;
}

export interface CorpusTotalsResponse {
    total_articles: number;
    total_journal_articles: number;
    total_conference_articles: number;
    total_authors: number;
    total_journals: number;
    total_conferences: number;
    earliest_year: number | null;
    latest_year: number | null;
}

export interface PublisherOption {
    name: string;
    journal_count: number;
}

export interface FieldOfResearchOption {
    code: string;
    description: string | null;
}

export interface FilterOptionsResponse {
    subject_areas: string[];
    publishers: PublisherOption[];
    fields_of_research: FieldOfResearchOption[];
    conference_ranks: string[];
}

export interface JournalSummary {
    journal_id: number;
    title: string;
    publisher: string | null;
    best_quartile: string | null;
    best_subject_area: string | null;
    sjr_index: number | null;
}

export interface JournalProfile {
    journal_id: number;
    title: string;
    publisher: string | null;
    country: string | null;
    best_quartile: string | null;
    best_subject_area: string | null;
    sjr_index: number | null;
    citation_score: number | null;
    h_index: number | null;
    total_documents: number | null;
    total_documents_3y: number | null;
    total_references: number | null;
    total_citations_3y: number | null;
    citable_documents_3y: number | null;
    citations_per_document_2y: number | null;
    references_per_document: number | null;
    total_articles: number;
    earliest_year: number | null;
    latest_year: number | null;
    distinct_authors_total: number;
    average_articles_per_year: number | null;
    average_authors_per_article_overall: number | null;
}

export interface JournalYearlyStatistic {
    year: number;
    articles_count: number;
    distinct_authors: number;
    total_authors: number;
    average_authors_per_article: number | null;
}

export interface JournalArticle {
    article_id: number;
    title: string;
    year: number | null;
    pages: string | null;
    url: string | null;
}

export interface ConferenceSummary {
    conference_id: number;
    title: string;
    acronym: string | null;
    rank_value: string | null;
    primary_for: string | null;
    primary_for_description: string | null;
}

export interface ConferenceProfile {
    conference_id: number;
    title: string;
    acronym: string | null;
    rank_value: string | null;
    primary_for: string | null;
    primary_for_description: string | null;
    total_articles: number;
    earliest_year: number | null;
    latest_year: number | null;
    distinct_authors_total: number;
    average_articles_per_year: number | null;
    average_authors_per_article_overall: number | null;
}

export interface ConferenceYearlyStatistic {
    year: number;
    articles_count: number;
    distinct_authors: number;
    total_authors: number;
    average_authors_per_article: number | null;
}

export interface ConferenceArticle {
    article_id: number;
    title: string;
    year: number | null;
    pages: string | null;
    url: string | null;
}

export interface PaperAuthor {
    author_id: number;
    author_name: string;
}

export interface PaperDetails {
    article_id: number;
    title: string;
    year: number | null;
    pages: string | null;
    url: string | null;
    venue_type: VenueType;
    venue_id: number;
    venue_title: string;
    authors: PaperAuthor[];
}

export interface YearSummary {
    year: number;
    journal_articles: number;
    conference_articles: number;
    total_articles: number;
    distinct_journals: number;
    distinct_conferences: number;
    distinct_authors: number;
    total_authors: number;
}

export interface YearJournalEntry extends JournalSummary {
    articles_in_year: number;
}

export interface YearConferenceEntry extends ConferenceSummary {
    articles_in_year: number;
}

export interface YearArticle {
    article_id: number;
    title: string;
    venue_type: VenueType;
    venue_id: number;
    venue_title: string;
    pages: string | null;
    url: string | null;
}

export interface AuthorSummary {
    author_id: number;
    author_name: string;
    total_articles: number;
    earliest_year: number | null;
    latest_year: number | null;
}

export interface AuthorProfile {
    author_id: number;
    author_name: string;
    total_articles: number;
    earliest_year: number | null;
    latest_year: number | null;
    average_articles_per_year: number | null;
}

export interface AuthorYearlyStatistic {
    year: number;
    articles_count: number;
}

export interface AuthorArticle {
    article_id: number;
    title: string;
    year: number | null;
    venue_type: VenueType;
    venue_id: number;
    venue_title: string;
}

export interface PublisherQuartileEntry {
    publisher: string;
    best_quartile: string | null;
    journal_count: number;
}

export interface SubjectAreaYearlyEntry {
    best_subject_area: string;
    year: number;
    distinct_journals: number;
    articles_count: number;
}

export interface FieldOfResearchYearlyEntry {
    primary_for: string;
    primary_for_description: string | null;
    year: number;
    distinct_conferences: number;
    articles_count: number;
}

export interface VenueComparisonPoint {
    venue_id: number;
    venue_title: string;
    year: number;
    articles_count: number;
    distinct_authors: number;
    total_authors: number;
}

export interface VenueMetricsPoint {
    venue_id: number;
    venue_title: string;
    total_articles: number;
    average_articles_per_year: number | null;
    average_distinct_authors_per_year: number | null;
}

export interface AuthorsVsArticlesPoint {
    venue_id: number;
    venue_title: string;
    rank_or_quartile: string | null;
    average_articles_per_year: number | null;
    average_authors_per_article_overall: number | null;
    total_articles: number;
}

export interface JournalMetricPoint {
    journal_id: number;
    title: string;
    total_documents: number | null;
    total_documents_3y: number | null;
    total_references: number | null;
    total_citations_3y: number | null;
    citable_documents_3y: number | null;
    citations_per_document_2y: number | null;
    references_per_document: number | null;
    sjr_index: number | null;
    citation_score: number | null;
    h_index: number | null;
}

export interface YearRange {
    start_year?: number;
    end_year?: number;
}

export interface PaginationParams {
    page?: number;
    page_size?: number;
}
