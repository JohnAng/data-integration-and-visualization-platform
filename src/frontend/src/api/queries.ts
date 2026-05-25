/**
 * TanStack Query hooks per endpoint family. Each hook is a thin
 * wrapper around `apiFetch` that pins the cache key returned by
 * `queryKeys` and serialises the typed search-param object via
 * `serializeQuery`. Components import these hooks instead of calling
 * fetch directly so caching, retries and devtools work uniformly.
 */
import { useQuery } from "@tanstack/react-query";

import { apiFetch, serializeQuery } from "./client";
import {
    type AuthorListParams,
    type AuthorsVsArticlesParams,
    type ConferenceListParams,
    type FieldOfResearchYearlyParams,
    type JournalListParams,
    type JournalMetricsChartParams,
    queryKeys,
    type SortDirection,
    type SubjectAreaYearlyParams,
    type VenueComparisonParams,
    type VenueMetricsParams,
    type YearArticlesParams,
} from "./keys";

export interface SortInput {
    order_by?: string;
    order_dir?: SortDirection;
}
import type {
    AuthorArticle,
    AuthorProfile,
    AuthorsVsArticlesPoint,
    AuthorSummary,
    AuthorYearlyStatistic,
    ConferenceArticle,
    ConferenceProfile,
    ConferenceSummary,
    ConferenceYearlyStatistic,
    CorpusTotalsResponse,
    FieldOfResearchYearlyEntry,
    FilterOptionsResponse,
    JournalArticle,
    JournalMetricPoint,
    JournalProfile,
    JournalSummary,
    JournalYearlyStatistic,
    PaginatedResponse,
    PaperDetails,
    PublisherQuartileEntry,
    SubjectAreaYearlyEntry,
    VenueComparisonPoint,
    VenueMetricsPoint,
    YearArticle,
    YearConferenceEntry,
    YearJournalEntry,
    YearRange,
    YearSummary,
} from "./types";

export function useCorpusTotals() {
    return useQuery({
        queryKey: queryKeys.meta.totals(),
        queryFn: () => apiFetch<CorpusTotalsResponse>("/meta/totals"),
    });
}

export function useFilterOptions() {
    return useQuery({
        queryKey: queryKeys.meta.options(),
        queryFn: () => apiFetch<FilterOptionsResponse>("/meta/options"),
        staleTime: 30 * 60 * 1000,
    });
}

export function useJournalList(
    parameters: JournalListParams,
    options: { enabled?: boolean } = {},
) {
    return useQuery({
        queryKey: queryKeys.journals.list(parameters),
        enabled: options.enabled ?? true,
        queryFn: () =>
            apiFetch<PaginatedResponse<JournalSummary>>(
                `/journals${serializeQuery(parameters)}`,
            ),
    });
}

export function useJournalProfile(journalId: number, range: YearRange) {
    return useQuery({
        queryKey: queryKeys.journals.profile(journalId, range),
        queryFn: () =>
            apiFetch<JournalProfile>(`/journals/${journalId}${serializeQuery(range)}`),
        enabled: Number.isFinite(journalId) && journalId > 0,
    });
}

export function useJournalYearlyStatistics(journalId: number, range: YearRange) {
    return useQuery({
        queryKey: queryKeys.journals.yearly(journalId, range),
        queryFn: () =>
            apiFetch<JournalYearlyStatistic[]>(
                `/journals/${journalId}/yearly-statistics${serializeQuery(range)}`,
            ),
        enabled: Number.isFinite(journalId) && journalId > 0,
    });
}

export function useJournalArticles(
    journalId: number,
    range: YearRange,
    page: number,
    pageSize: number,
    sort?: SortInput,
) {
    return useQuery({
        queryKey: [
            ...queryKeys.journals.articles(journalId, range, page, pageSize),
            sort?.order_by,
            sort?.order_dir,
        ] as const,
        queryFn: () =>
            apiFetch<PaginatedResponse<JournalArticle>>(
                `/journals/${journalId}/articles${serializeQuery({
                    ...range,
                    page,
                    page_size: pageSize,
                    ...(sort ?? {}),
                })}`,
            ),
        enabled: Number.isFinite(journalId) && journalId > 0,
    });
}

export function useJournalPaper(journalId: number, articleId: number) {
    return useQuery({
        queryKey: queryKeys.journals.paper(journalId, articleId),
        queryFn: () =>
            apiFetch<PaperDetails>(`/journals/${journalId}/articles/${articleId}`),
        enabled:
            Number.isFinite(journalId) &&
            journalId > 0 &&
            Number.isFinite(articleId) &&
            articleId > 0,
    });
}

export function useConferenceList(
    parameters: ConferenceListParams,
    options: { enabled?: boolean } = {},
) {
    return useQuery({
        queryKey: queryKeys.conferences.list(parameters),
        enabled: options.enabled ?? true,
        queryFn: () =>
            apiFetch<PaginatedResponse<ConferenceSummary>>(
                `/conferences${serializeQuery(parameters)}`,
            ),
    });
}

export function useConferenceProfile(conferenceId: number, range: YearRange) {
    return useQuery({
        queryKey: queryKeys.conferences.profile(conferenceId, range),
        queryFn: () =>
            apiFetch<ConferenceProfile>(
                `/conferences/${conferenceId}${serializeQuery(range)}`,
            ),
        enabled: Number.isFinite(conferenceId) && conferenceId > 0,
    });
}

export function useConferenceYearlyStatistics(conferenceId: number, range: YearRange) {
    return useQuery({
        queryKey: queryKeys.conferences.yearly(conferenceId, range),
        queryFn: () =>
            apiFetch<ConferenceYearlyStatistic[]>(
                `/conferences/${conferenceId}/yearly-statistics${serializeQuery(range)}`,
            ),
        enabled: Number.isFinite(conferenceId) && conferenceId > 0,
    });
}

export function useConferenceArticles(
    conferenceId: number,
    range: YearRange,
    page: number,
    pageSize: number,
    sort?: SortInput,
) {
    return useQuery({
        queryKey: [
            ...queryKeys.conferences.articles(conferenceId, range, page, pageSize),
            sort?.order_by,
            sort?.order_dir,
        ] as const,
        queryFn: () =>
            apiFetch<PaginatedResponse<ConferenceArticle>>(
                `/conferences/${conferenceId}/articles${serializeQuery({
                    ...range,
                    page,
                    page_size: pageSize,
                    ...(sort ?? {}),
                })}`,
            ),
        enabled: Number.isFinite(conferenceId) && conferenceId > 0,
    });
}

export function useConferencePaper(conferenceId: number, articleId: number) {
    return useQuery({
        queryKey: queryKeys.conferences.paper(conferenceId, articleId),
        queryFn: () =>
            apiFetch<PaperDetails>(
                `/conferences/${conferenceId}/articles/${articleId}`,
            ),
        enabled:
            Number.isFinite(conferenceId) &&
            conferenceId > 0 &&
            Number.isFinite(articleId) &&
            articleId > 0,
    });
}

export function useYearSummaries(range: YearRange) {
    return useQuery({
        queryKey: queryKeys.years.list(range),
        queryFn: () => apiFetch<YearSummary[]>(`/years${serializeQuery(range)}`),
    });
}

export function useYearProfile(year: number) {
    return useQuery({
        queryKey: queryKeys.years.profile(year),
        queryFn: () => apiFetch<YearSummary>(`/years/${year}`),
        enabled: Number.isFinite(year) && year >= 1900,
    });
}

export function useYearJournals(
    year: number,
    page: number,
    pageSize: number,
    sort?: SortInput,
) {
    return useQuery({
        queryKey: [
            ...queryKeys.years.journals(year, page, pageSize),
            sort?.order_by,
            sort?.order_dir,
        ] as const,
        queryFn: () =>
            apiFetch<PaginatedResponse<YearJournalEntry>>(
                `/years/${year}/journals${serializeQuery({
                    page,
                    page_size: pageSize,
                    ...(sort ?? {}),
                })}`,
            ),
        enabled: Number.isFinite(year) && year >= 1900,
    });
}

export function useYearConferences(
    year: number,
    page: number,
    pageSize: number,
    sort?: SortInput,
) {
    return useQuery({
        queryKey: [
            ...queryKeys.years.conferences(year, page, pageSize),
            sort?.order_by,
            sort?.order_dir,
        ] as const,
        queryFn: () =>
            apiFetch<PaginatedResponse<YearConferenceEntry>>(
                `/years/${year}/conferences${serializeQuery({
                    page,
                    page_size: pageSize,
                    ...(sort ?? {}),
                })}`,
            ),
        enabled: Number.isFinite(year) && year >= 1900,
    });
}

export function useYearArticles(year: number, parameters: YearArticlesParams) {
    return useQuery({
        queryKey: queryKeys.years.articles(year, parameters),
        queryFn: () =>
            apiFetch<PaginatedResponse<YearArticle>>(
                `/years/${year}/articles${serializeQuery(parameters)}`,
            ),
        enabled: Number.isFinite(year) && year >= 1900,
    });
}

export function useAuthorList(parameters: AuthorListParams) {
    return useQuery({
        queryKey: queryKeys.authors.list(parameters),
        queryFn: () =>
            apiFetch<PaginatedResponse<AuthorSummary>>(
                `/authors${serializeQuery(parameters)}`,
            ),
    });
}

export function useAuthorProfile(authorId: number) {
    return useQuery({
        queryKey: queryKeys.authors.profile(authorId),
        queryFn: () => apiFetch<AuthorProfile>(`/authors/${authorId}`),
        enabled: Number.isFinite(authorId) && authorId > 0,
    });
}

export function useAuthorYearlyStatistics(authorId: number) {
    return useQuery({
        queryKey: queryKeys.authors.yearly(authorId),
        queryFn: () =>
            apiFetch<AuthorYearlyStatistic[]>(`/authors/${authorId}/yearly-statistics`),
        enabled: Number.isFinite(authorId) && authorId > 0,
    });
}

export function useAuthorArticles(
    authorId: number,
    range: YearRange,
    page: number,
    pageSize: number,
    sort?: SortInput,
) {
    return useQuery({
        queryKey: [
            ...queryKeys.authors.articles(authorId, range, page, pageSize),
            sort?.order_by,
            sort?.order_dir,
        ] as const,
        queryFn: () =>
            apiFetch<PaginatedResponse<AuthorArticle>>(
                `/authors/${authorId}/articles${serializeQuery({
                    ...range,
                    page,
                    page_size: pageSize,
                    ...(sort ?? {}),
                })}`,
            ),
        enabled: Number.isFinite(authorId) && authorId > 0,
    });
}

export function usePublisherQuartileChart() {
    return useQuery({
        queryKey: queryKeys.charts.publisherQuartile(),
        queryFn: () =>
            apiFetch<PublisherQuartileEntry[]>(
                "/charts/publisher-quartile-distribution",
            ),
    });
}

export function useSubjectAreaYearlyChart(parameters: SubjectAreaYearlyParams) {
    return useQuery({
        queryKey: queryKeys.charts.subjectAreaYearly(parameters),
        queryFn: () =>
            apiFetch<SubjectAreaYearlyEntry[]>(
                `/charts/subject-area-yearly-summary${serializeQuery(parameters)}`,
            ),
    });
}

export function useFieldOfResearchYearlyChart(parameters: FieldOfResearchYearlyParams) {
    return useQuery({
        queryKey: queryKeys.charts.fieldOfResearchYearly(parameters),
        queryFn: () =>
            apiFetch<FieldOfResearchYearlyEntry[]>(
                `/charts/field-of-research-yearly-summary${serializeQuery(parameters)}`,
            ),
    });
}

export function useVenueComparisonChart(parameters: VenueComparisonParams) {
    return useQuery({
        queryKey: queryKeys.charts.venueComparison(parameters),
        queryFn: () =>
            apiFetch<VenueComparisonPoint[]>(
                `/charts/venue-comparison${serializeQuery(parameters)}`,
            ),
        enabled: parameters.venue_ids.length > 0,
    });
}

export function useVenueMetricsChart(parameters: VenueMetricsParams) {
    return useQuery({
        queryKey: queryKeys.charts.venueMetrics(parameters),
        queryFn: () =>
            apiFetch<VenueMetricsPoint[]>(
                `/charts/venue-metrics${serializeQuery(parameters)}`,
            ),
        enabled: parameters.venue_ids.length > 0,
    });
}

export function useAuthorsVsArticlesChart(parameters: AuthorsVsArticlesParams) {
    return useQuery({
        queryKey: queryKeys.charts.authorsVsArticles(parameters),
        queryFn: () =>
            apiFetch<AuthorsVsArticlesPoint[]>(
                `/charts/authors-vs-articles-scatter${serializeQuery(parameters)}`,
            ),
    });
}

export function useJournalMetricsChart(parameters: JournalMetricsChartParams) {
    return useQuery({
        queryKey: queryKeys.charts.journalMetrics(parameters),
        queryFn: () =>
            apiFetch<JournalMetricPoint[]>(
                `/charts/journal-metrics${serializeQuery(parameters)}`,
            ),
    });
}
