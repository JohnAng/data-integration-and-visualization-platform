import { HttpResponse, http } from "msw";

import type {
    AuthorArticle,
    AuthorProfile,
    AuthorSummary,
    AuthorsVsArticlesPoint,
    AuthorYearlyStatistic,
    ConferenceArticle,
    ConferenceProfile,
    ConferenceSummary,
    ConferenceYearlyStatistic,
    CorpusTotalsResponse,
    FieldOfResearchYearlyEntry,
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
    YearSummary,
} from "../api/types";

const BASE = "*/api";

function paginated<ItemType>(items: ItemType[], page = 1, page_size = 50): PaginatedResponse<ItemType> {
    return { items, page, page_size, total_items: items.length };
}

const corpusTotals: CorpusTotalsResponse = {
    total_articles: 2_525_752,
    total_journal_articles: 1_112_662,
    total_conference_articles: 1_413_090,
    total_authors: 1_395_532,
    total_journals: 1_423,
    total_conferences: 5_566,
    earliest_year: 1936,
    latest_year: 2014,
};

const journalSummaries: JournalSummary[] = [
    {
        journal_id: 1,
        title: "IEEE Trans. on Knowledge and Data Engineering",
        publisher: "IEEE",
        best_quartile: "Q1",
        best_subject_area: "Computer Science",
        sjr_index: 2.358,
    },
    {
        journal_id: 2,
        title: "Information Systems",
        publisher: "Elsevier",
        best_quartile: "Q1",
        best_subject_area: "Computer Science",
        sjr_index: 0.976,
    },
    {
        journal_id: 3,
        title: "Some Unranked Journal",
        publisher: null,
        best_quartile: null,
        best_subject_area: null,
        sjr_index: null,
    },
];

const journalProfile: JournalProfile = {
    journal_id: 1,
    title: "IEEE Trans. on Knowledge and Data Engineering",
    publisher: "IEEE",
    country: "United States",
    best_quartile: "Q1",
    best_subject_area: "Computer Science",
    sjr_index: 2.358,
    citation_score: 12.4,
    h_index: 190,
    total_documents: 22496,
    total_documents_3y: 5269,
    total_references: null,
    total_citations_3y: null,
    citable_documents_3y: 646,
    citations_per_document_2y: 7.0,
    references_per_document: 27.2,
    total_articles: 3210,
    earliest_year: 1989,
    latest_year: 2014,
    distinct_authors_total: 4612,
    average_articles_per_year: 129.2,
    average_authors_per_article_overall: 2.8,
};

const journalYearly: JournalYearlyStatistic[] = [
    { year: 2010, articles_count: 200, distinct_authors: 350, total_authors: 580, average_authors_per_article: 2.9 },
    { year: 2011, articles_count: 215, distinct_authors: 360, total_authors: 605, average_authors_per_article: 2.8 },
    { year: 2012, articles_count: 230, distinct_authors: 380, total_authors: 640, average_authors_per_article: 2.8 },
    { year: 2013, articles_count: 240, distinct_authors: 400, total_authors: 670, average_authors_per_article: 2.8 },
    { year: 2014, articles_count: 40, distinct_authors: 80, total_authors: 110, average_authors_per_article: 2.8 },
];

const journalArticles: JournalArticle[] = [
    { article_id: 101, title: "Paper A", year: 2013, pages: "1-12", url: "db/journals/tkde/a.html" },
    { article_id: 102, title: "Paper B", year: 2013, pages: "13-24", url: "db/journals/tkde/b.html" },
];

const journalPaper: PaperDetails = {
    article_id: 101,
    title: "Paper A",
    year: 2013,
    pages: "1-12",
    url: "db/journals/tkde/a.html",
    venue_type: "journal",
    venue_id: 1,
    venue_title: "IEEE Trans. on Knowledge and Data Engineering",
    authors: [
        { author_id: 11, author_name: "Alice Smith" },
        { author_id: 12, author_name: "Bob Jones" },
    ],
};

const conferenceSummaries: ConferenceSummary[] = [
    {
        conference_id: 1,
        title: "International Conference on Data Engineering",
        acronym: "ICDE",
        rank_value: "A*",
        primary_for: "4605",
        primary_for_description: "Data management and data science",
    },
    {
        conference_id: 2,
        title: "Some Unranked Conference",
        acronym: null,
        rank_value: null,
        primary_for: null,
        primary_for_description: null,
    },
];

const conferenceProfile: ConferenceProfile = {
    conference_id: 1,
    title: "International Conference on Data Engineering",
    acronym: "ICDE",
    rank_value: "A*",
    primary_for: "4605",
    primary_for_description: "Data management and data science",
    total_articles: 4500,
    earliest_year: 1984,
    latest_year: 2014,
    distinct_authors_total: 8200,
    average_articles_per_year: 145.2,
    average_authors_per_article_overall: 3.1,
};

const conferenceYearly: ConferenceYearlyStatistic[] = journalYearly.map((row) => ({ ...row }));

const conferenceArticles: ConferenceArticle[] = [
    { article_id: 201, title: "ICDE Paper A", year: 2013, pages: "1-12", url: "db/conf/icde/a.html" },
];

const conferencePaper: PaperDetails = {
    ...journalPaper,
    article_id: 201,
    title: "ICDE Paper A",
    venue_type: "conference",
    venue_id: 1,
    venue_title: "International Conference on Data Engineering",
};

const authorSummaries: AuthorSummary[] = [
    {
        author_id: 11,
        author_name: "Alice Smith",
        total_articles: 42,
        earliest_year: 2001,
        latest_year: 2014,
    },
    {
        author_id: 12,
        author_name: "Bob Jones",
        total_articles: 8,
        earliest_year: 2010,
        latest_year: 2024,
    },
];

const authorProfile: AuthorProfile = {
    author_id: 11,
    author_name: "Alice Smith",
    total_articles: 42,
    earliest_year: 2001,
    latest_year: 2014,
    average_articles_per_year: 3.0,
};

const authorYearly: AuthorYearlyStatistic[] = [
    { year: 2012, articles_count: 5 },
    { year: 2013, articles_count: 4 },
    { year: 2014, articles_count: 1 },
];

const authorArticles: AuthorArticle[] = [
    {
        article_id: 101,
        title: "Paper A",
        year: 2013,
        venue_type: "journal",
        venue_id: 1,
        venue_title: "IEEE Trans. on Knowledge and Data Engineering",
    },
];

const yearSummaries: YearSummary[] = [
    {
        year: 2012,
        journal_articles: 95000,
        conference_articles: 112000,
        total_articles: 207000,
        distinct_journals: 800,
        distinct_conferences: 1500,
        distinct_authors: 320000,
        total_authors: 450000,
    },
    {
        year: 2013,
        journal_articles: 97000,
        conference_articles: 103000,
        total_articles: 200000,
        distinct_journals: 820,
        distinct_conferences: 1450,
        distinct_authors: 330000,
        total_authors: 460000,
    },
    {
        year: 2014,
        journal_articles: 28000,
        conference_articles: 6700,
        total_articles: 35000,
        distinct_journals: 400,
        distinct_conferences: 200,
        distinct_authors: 90000,
        total_authors: 110000,
    },
];

const yearJournalEntries: YearJournalEntry[] = journalSummaries.map((row) => ({
    ...row,
    articles_in_year: 200,
}));

const yearConferenceEntries: YearConferenceEntry[] = conferenceSummaries.map((row) => ({
    ...row,
    articles_in_year: 150,
}));

const yearArticles: YearArticle[] = [
    {
        article_id: 101,
        title: "Paper A",
        venue_type: "journal",
        venue_id: 1,
        venue_title: "IEEE Trans. on Knowledge and Data Engineering",
        pages: "1-12",
        url: "db/journals/tkde/a.html",
    },
];

const publisherQuartile: PublisherQuartileEntry[] = [
    { publisher: "IEEE", best_quartile: "Q1", journal_count: 120 },
    { publisher: "IEEE", best_quartile: "Q2", journal_count: 35 },
    { publisher: "Elsevier", best_quartile: "Q1", journal_count: 200 },
];

const subjectAreaYearly: SubjectAreaYearlyEntry[] = [
    { best_subject_area: "Computer Science", year: 2012, distinct_journals: 100, articles_count: 5000 },
    { best_subject_area: "Computer Science", year: 2013, distinct_journals: 110, articles_count: 5500 },
];

const forYearly: FieldOfResearchYearlyEntry[] = [
    {
        primary_for: "4605",
        primary_for_description: "Data management and data science",
        year: 2012,
        distinct_conferences: 80,
        articles_count: 2000,
    },
];

const venueComparison: VenueComparisonPoint[] = [
    {
        venue_id: 1,
        venue_title: "ICDE",
        year: 2012,
        articles_count: 150,
        distinct_authors: 300,
        total_authors: 500,
    },
];

const venueMetrics: VenueMetricsPoint[] = [
    {
        venue_id: 1,
        venue_title: "ICDE",
        total_articles: 4500,
        average_articles_per_year: 145,
        average_distinct_authors_per_year: 280,
    },
];

const authorsVsArticles: AuthorsVsArticlesPoint[] = [
    {
        venue_id: 1,
        venue_title: "ICDE",
        rank_or_quartile: "A*",
        average_articles_per_year: 145,
        average_authors_per_article_overall: 3.1,
        total_articles: 4500,
    },
];

const journalMetrics: JournalMetricPoint[] = [
    {
        journal_id: 1,
        title: "TKDE",
        total_documents: 22496,
        total_documents_3y: 5269,
        total_references: null,
        total_citations_3y: null,
        citable_documents_3y: 646,
        citations_per_document_2y: 7.0,
        references_per_document: 27.2,
        sjr_index: 2.358,
        citation_score: 12.4,
        h_index: 190,
    },
];

export const defaultHandlers = [
    http.get(`${BASE}/meta/totals`, () => HttpResponse.json(corpusTotals)),
    http.get(`${BASE}/meta/options`, () =>
        HttpResponse.json({
            subject_areas: ["Computer Science", "Engineering"],
            publishers: [
                { name: "IEEE", journal_count: 12 },
                { name: "Elsevier", journal_count: 9 },
            ],
            fields_of_research: [
                { code: "4605", description: "Data management and data science" },
                { code: "4606", description: "Distributed computing" },
            ],
            conference_ranks: ["A*", "A", "B", "C", "Multiconference"],
        }),
    ),

    http.get(`${BASE}/journals`, ({ request }) => {
        const url = new URL(request.url);
        const rankedOnly = url.searchParams.get("ranked_only") === "true";
        const items = rankedOnly
            ? journalSummaries.filter((row) => row.best_quartile != null)
            : journalSummaries;
        return HttpResponse.json(paginated(items));
    }),
    http.get(`${BASE}/journals/:journalId`, () => HttpResponse.json(journalProfile)),
    http.get(`${BASE}/journals/:journalId/yearly-statistics`, () => HttpResponse.json(journalYearly)),
    http.get(`${BASE}/journals/:journalId/articles`, () => HttpResponse.json(paginated(journalArticles))),
    http.get(`${BASE}/journals/:journalId/articles/:articleId`, () => HttpResponse.json(journalPaper)),

    http.get(`${BASE}/conferences`, ({ request }) => {
        const url = new URL(request.url);
        const rankedOnly = url.searchParams.get("ranked_only") === "true";
        const items = rankedOnly
            ? conferenceSummaries.filter((row) => row.rank_value != null)
            : conferenceSummaries;
        return HttpResponse.json(paginated(items));
    }),
    http.get(`${BASE}/conferences/:conferenceId`, () => HttpResponse.json(conferenceProfile)),
    http.get(`${BASE}/conferences/:conferenceId/yearly-statistics`, () => HttpResponse.json(conferenceYearly)),
    http.get(`${BASE}/conferences/:conferenceId/articles`, () => HttpResponse.json(paginated(conferenceArticles))),
    http.get(`${BASE}/conferences/:conferenceId/articles/:articleId`, () => HttpResponse.json(conferencePaper)),

    http.get(`${BASE}/authors`, () => HttpResponse.json(paginated(authorSummaries))),
    http.get(`${BASE}/authors/:authorId`, () => HttpResponse.json(authorProfile)),
    http.get(`${BASE}/authors/:authorId/yearly-statistics`, () => HttpResponse.json(authorYearly)),
    http.get(`${BASE}/authors/:authorId/articles`, () => HttpResponse.json(paginated(authorArticles))),

    http.get(`${BASE}/years`, () => HttpResponse.json(yearSummaries)),
    http.get(`${BASE}/years/:year`, () => HttpResponse.json(yearSummaries[1])),
    http.get(`${BASE}/years/:year/journals`, () => HttpResponse.json(paginated(yearJournalEntries))),
    http.get(`${BASE}/years/:year/conferences`, () => HttpResponse.json(paginated(yearConferenceEntries))),
    http.get(`${BASE}/years/:year/articles`, () => HttpResponse.json(paginated(yearArticles))),

    http.get(`${BASE}/charts/publisher-quartile-distribution`, () => HttpResponse.json(publisherQuartile)),
    http.get(`${BASE}/charts/subject-area-yearly-summary`, () => HttpResponse.json(subjectAreaYearly)),
    http.get(`${BASE}/charts/field-of-research-yearly-summary`, () => HttpResponse.json(forYearly)),
    http.get(`${BASE}/charts/venue-comparison`, () => HttpResponse.json(venueComparison)),
    http.get(`${BASE}/charts/venue-metrics`, () => HttpResponse.json(venueMetrics)),
    http.get(`${BASE}/charts/authors-vs-articles-scatter`, () => HttpResponse.json(authorsVsArticles)),
    http.get(`${BASE}/charts/journal-metrics`, () => HttpResponse.json(journalMetrics)),
];

export const fixtures = {
    corpusTotals,
    journalSummaries,
    journalProfile,
    journalYearly,
    journalArticles,
    journalPaper,
    conferenceSummaries,
    conferenceProfile,
    conferenceYearly,
    conferenceArticles,
    conferencePaper,
    authorSummaries,
    authorProfile,
    authorYearly,
    authorArticles,
    yearSummaries,
    yearJournalEntries,
    yearConferenceEntries,
    yearArticles,
    publisherQuartile,
    subjectAreaYearly,
    forYearly,
    venueComparison,
    venueMetrics,
    authorsVsArticles,
    journalMetrics,
};
