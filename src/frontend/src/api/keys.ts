import type { YearRange } from "./types";

/**
 * Centralised TanStack Query key factory. Every query hook reads its
 * key here so consumers can invalidate or read cache entries by family
 * without scattering raw string arrays across the codebase.
 *
 * Convention: keys nest as [resource, id?, sub-resource?, params?].
 */

export type SortDirection = "asc" | "desc";

export interface SortParams {
    order_by?: string;
    order_dir?: SortDirection;
}

export interface JournalListParams extends SortParams {
    page?: number;
    page_size?: number;
    search_text?: string;
    publisher?: string;
    best_quartile?: string;
    best_subject_area?: string;
    ranked_only?: boolean;
    has_publisher?: boolean;
    has_subject_area?: boolean;
}

export interface ConferenceListParams extends SortParams {
    page?: number;
    page_size?: number;
    search_text?: string;
    rank_value?: string;
    primary_for?: string;
    ranked_only?: boolean;
    has_acronym?: boolean;
    has_for?: boolean;
}

export interface AuthorListParams extends SortParams {
    page?: number;
    page_size?: number;
    name_query?: string;
    min_articles?: number;
}

export interface YearArticlesParams extends SortParams {
    page?: number;
    page_size?: number;
    conference_id?: number;
    journal_id?: number;
    author_id?: number;
}

export interface YearVenueListParams extends SortParams {
    page?: number;
    page_size?: number;
}

export interface VenueArticlesParams extends SortParams {
    page?: number;
    page_size?: number;
    start_year?: number;
    end_year?: number;
}

export interface AuthorArticlesParams extends SortParams {
    page?: number;
    page_size?: number;
    start_year?: number;
    end_year?: number;
}

export type ChartGranularity = "year" | "five_year" | "decade";

export interface VenueComparisonParams {
    venue_type: "journal" | "conference";
    venue_ids: number[];
    start_year?: number;
    end_year?: number;
    granularity?: ChartGranularity;
}

export interface VenueMetricsParams {
    venue_type: "journal" | "conference";
    venue_ids: number[];
}

export interface AuthorsVsArticlesParams {
    venue_type: "journal" | "conference";
    maximum_points?: number;
    minimum_articles?: number;
    rank_or_quartile?: string;
}

export interface JournalMetricsChartParams {
    best_subject_area?: string;
    best_quartile?: string;
    publisher?: string;
    maximum_points?: number;
}

export interface SubjectAreaYearlyParams {
    subject_areas?: string[];
    start_year?: number;
    end_year?: number;
    granularity?: ChartGranularity;
}

export interface FieldOfResearchYearlyParams {
    primary_fors?: string[];
    start_year?: number;
    end_year?: number;
    granularity?: ChartGranularity;
}

export const queryKeys = {
    meta: {
        totals: () => ["meta", "totals"] as const,
        options: () => ["meta", "options"] as const,
    },
    journals: {
        list: (parameters: JournalListParams) => ["journals", "list", parameters] as const,
        profile: (journalId: number, range: YearRange) =>
            ["journals", journalId, "profile", range] as const,
        yearly: (journalId: number, range: YearRange) =>
            ["journals", journalId, "yearly", range] as const,
        articles: (journalId: number, range: YearRange, page: number, pageSize: number) =>
            ["journals", journalId, "articles", { range, page, pageSize }] as const,
        paper: (journalId: number, articleId: number) =>
            ["journals", journalId, "articles", articleId] as const,
    },
    conferences: {
        list: (parameters: ConferenceListParams) =>
            ["conferences", "list", parameters] as const,
        profile: (conferenceId: number, range: YearRange) =>
            ["conferences", conferenceId, "profile", range] as const,
        yearly: (conferenceId: number, range: YearRange) =>
            ["conferences", conferenceId, "yearly", range] as const,
        articles: (
            conferenceId: number,
            range: YearRange,
            page: number,
            pageSize: number,
        ) => ["conferences", conferenceId, "articles", { range, page, pageSize }] as const,
        paper: (conferenceId: number, articleId: number) =>
            ["conferences", conferenceId, "articles", articleId] as const,
    },
    years: {
        list: (range: YearRange) => ["years", "list", range] as const,
        profile: (year: number) => ["years", year, "profile"] as const,
        journals: (year: number, page: number, pageSize: number) =>
            ["years", year, "journals", { page, pageSize }] as const,
        conferences: (year: number, page: number, pageSize: number) =>
            ["years", year, "conferences", { page, pageSize }] as const,
        articles: (year: number, parameters: YearArticlesParams) =>
            ["years", year, "articles", parameters] as const,
    },
    authors: {
        list: (parameters: AuthorListParams) => ["authors", "list", parameters] as const,
        profile: (authorId: number) => ["authors", authorId, "profile"] as const,
        yearly: (authorId: number) => ["authors", authorId, "yearly"] as const,
        articles: (
            authorId: number,
            range: YearRange,
            page: number,
            pageSize: number,
        ) => ["authors", authorId, "articles", { range, page, pageSize }] as const,
    },
    charts: {
        publisherQuartile: () => ["charts", "publisher-quartile"] as const,
        subjectAreaYearly: (parameters: SubjectAreaYearlyParams) =>
            ["charts", "subject-area-yearly", parameters] as const,
        fieldOfResearchYearly: (parameters: FieldOfResearchYearlyParams) =>
            ["charts", "field-of-research-yearly", parameters] as const,
        venueComparison: (parameters: VenueComparisonParams) =>
            ["charts", "venue-comparison", parameters] as const,
        venueMetrics: (parameters: VenueMetricsParams) =>
            ["charts", "venue-metrics", parameters] as const,
        authorsVsArticles: (parameters: AuthorsVsArticlesParams) =>
            ["charts", "authors-vs-articles", parameters] as const,
        journalMetrics: (parameters: JournalMetricsChartParams) =>
            ["charts", "journal-metrics", parameters] as const,
    },
};
