/**
 * Year detail route ("/years/$year") — four-tile KPI grid for the
 * picked year plus Tabs that switch between articles, journals and
 * conferences sub-views. The Articles tab also exposes
 * conference / journal / author filters that write search params.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import {
    useYearArticles,
    useYearConferences,
    useYearJournals,
    useYearProfile,
} from "../api/queries";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { MetricsGrid, MetricTile } from "../components/metrics/MetricTile";
import {
    PaginatedTable,
    type PaginatedTableColumn,
} from "../components/tables/PaginatedTable";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { formatCompact, formatThousands } from "../lib/formatNumber";
import type {
    YearArticle,
    YearConferenceEntry,
    YearJournalEntry,
} from "../api/types";

const PAGE_SIZE = 25;

const yearDetailSearchSchema = z.object({
    tab: z.enum(["articles", "journals", "conferences"]).default("articles"),
    page: z.coerce.number().int().min(1).default(1),
    conference_id: z.coerce.number().int().positive().optional(),
    journal_id: z.coerce.number().int().positive().optional(),
    author_id: z.coerce.number().int().positive().optional(),
    order_by: z.string().optional(),
    order_dir: z.enum(["asc", "desc"]).optional(),
});

interface SortState {
    key: string;
    direction: "asc" | "desc";
}

export const Route = createFileRoute("/years/$year")({
    component: YearDetailPage,
    validateSearch: (search) => yearDetailSearchSchema.parse(search),
});

function YearDetailPage() {
    const { year: yearParam } = Route.useParams();
    const search = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const year = Number.parseInt(yearParam, 10);

    const profileQuery = useYearProfile(year);
    const profile = profileQuery.data;

    const setSearch = (updates: Partial<typeof search>) =>
        navigate({
            search: (previous) => ({ ...previous, ...updates }),
            replace: true,
            resetScroll: false,
        });

    const setTab = (tab: typeof search.tab) =>
        setSearch({ tab, page: 1, order_by: undefined, order_dir: undefined });

    const setPage = (page: number) => setSearch({ page });

    const sort: SortState | undefined = search.order_by
        ? { key: search.order_by, direction: search.order_dir ?? "asc" }
        : undefined;

    const setSort = (next: SortState | undefined) =>
        setSearch({
            order_by: next?.key,
            order_dir: next?.direction,
            page: 1,
        });

    if (profileQuery.isError) {
        return (
            <AppShell>
                <PageContainer>
                    <ErrorCard
                        error={profileQuery.error}
                        onRetry={() => profileQuery.refetch()}
                    />
                </PageContainer>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageContainer>
                <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                    <Link to="/years" className="hover:text-ochre">
                        ← Years
                    </Link>
                </p>

                {profileQuery.isPending ? (
                    <Skeleton className="h-16 w-3/4 mb-12" />
                ) : (
                    <PageHeader
                        eyebrow="Year"
                        title={yearParam}
                        lede={
                            profile
                                ? `${formatThousands(profile.total_articles)} articles published · ${formatThousands(profile.distinct_authors)} distinct authors.`
                                : null
                        }
                    />
                )}

                {profile ? (
                    <div className="mb-12">
                        <MetricsGrid columns={4}>
                            <MetricTile
                                label="Total"
                                value={formatCompact(profile.total_articles)}
                                sublabel={`${formatThousands(profile.total_articles)} articles`}
                            />
                            <MetricTile
                                label="Journals"
                                value={formatCompact(profile.distinct_journals)}
                                sublabel={`${formatThousands(profile.journal_articles)} journal articles`}
                            />
                            <MetricTile
                                label="Conferences"
                                value={formatCompact(profile.distinct_conferences)}
                                sublabel={`${formatThousands(profile.conference_articles)} conf. articles`}
                            />
                            <MetricTile
                                label="Authors"
                                value={formatCompact(profile.distinct_authors)}
                                sublabel={`${formatThousands(profile.total_authors)} authorships`}
                            />
                        </MetricsGrid>
                    </div>
                ) : (
                    <Skeleton className="h-32 mb-12" />
                )}

                <Tabs value={search.tab} onValueChange={(value) => setTab(value as typeof search.tab)}>
                    <TabsList>
                        <TabsTrigger value="articles">Articles</TabsTrigger>
                        <TabsTrigger value="journals">Journals</TabsTrigger>
                        <TabsTrigger value="conferences">Conferences</TabsTrigger>
                    </TabsList>

                    <TabsContent value="articles">
                        <YearArticlesTab
                            year={year}
                            page={search.page}
                            conferenceId={search.conference_id}
                            journalId={search.journal_id}
                            authorId={search.author_id}
                            sort={sort}
                            onSortChange={setSort}
                            onPageChange={setPage}
                            onFiltersChange={(filters) =>
                                setSearch({
                                    ...filters,
                                    page: 1,
                                })
                            }
                        />
                    </TabsContent>
                    <TabsContent value="journals">
                        <YearJournalsTab
                            year={year}
                            page={search.page}
                            sort={sort}
                            onSortChange={setSort}
                            onPageChange={setPage}
                        />
                    </TabsContent>
                    <TabsContent value="conferences">
                        <YearConferencesTab
                            year={year}
                            page={search.page}
                            sort={sort}
                            onSortChange={setSort}
                            onPageChange={setPage}
                        />
                    </TabsContent>
                </Tabs>
            </PageContainer>
        </AppShell>
    );
}

interface TabProps {
    year: number;
    page: number;
    sort: SortState | undefined;
    onSortChange: (next: SortState | undefined) => void;
    onPageChange: (page: number) => void;
}

interface ArticlesTabProps extends TabProps {
    conferenceId: number | undefined;
    journalId: number | undefined;
    authorId: number | undefined;
    onFiltersChange: (filters: {
        conference_id: number | undefined;
        journal_id: number | undefined;
        author_id: number | undefined;
    }) => void;
}

function YearArticlesTab({
    year,
    page,
    conferenceId,
    journalId,
    authorId,
    sort,
    onSortChange,
    onPageChange,
    onFiltersChange,
}: ArticlesTabProps) {
    const query = useYearArticles(year, {
        page,
        page_size: PAGE_SIZE,
        conference_id: conferenceId,
        journal_id: journalId,
        author_id: authorId,
        order_by: sort?.key,
        order_dir: sort?.direction,
    });
    const hasFilter =
        conferenceId !== undefined || journalId !== undefined || authorId !== undefined;
    return (
        <>
            <YearArticleFilters
                conferenceId={conferenceId}
                journalId={journalId}
                authorId={authorId}
                onApply={onFiltersChange}
            />
            {hasFilter ? (
                <p className="text-body-sm text-slate italic mb-6">
                    Filters active. Switching tabs preserves them.
                </p>
            ) : null}
            {query.isError ? (
                <ErrorCard error={query.error} onRetry={() => query.refetch()} />
            ) : (
                <PaginatedTable<YearArticle>
                    columns={ARTICLE_COLUMNS}
                    rows={query.data?.items ?? []}
                    page={page}
                    pageSize={PAGE_SIZE}
                    totalItems={query.data?.total_items ?? 0}
                    isLoading={query.isPending}
                    onPageChange={onPageChange}
                    rowKey={(row) => `${row.venue_type}-${row.article_id}`}
                    sort={sort}
                    onSortChange={onSortChange}
                    emptyTitle="No articles indexed for these filters."
                    emptyDescription="Clear the venue / author filter to see every article in this year."
                />
            )}
        </>
    );
}

interface FilterDraft {
    conferenceId: string;
    journalId: string;
    authorId: string;
}

function YearArticleFilters({
    conferenceId,
    journalId,
    authorId,
    onApply,
}: {
    conferenceId: number | undefined;
    journalId: number | undefined;
    authorId: number | undefined;
    onApply: (filters: {
        conference_id: number | undefined;
        journal_id: number | undefined;
        author_id: number | undefined;
    }) => void;
}) {
    const [draft, setDraft] = useState<FilterDraft>({
        conferenceId: conferenceId?.toString() ?? "",
        journalId: journalId?.toString() ?? "",
        authorId: authorId?.toString() ?? "",
    });

    useEffect(() => {
        setDraft({
            conferenceId: conferenceId?.toString() ?? "",
            journalId: journalId?.toString() ?? "",
            authorId: authorId?.toString() ?? "",
        });
    }, [conferenceId, journalId, authorId]);

    const apply = () =>
        onApply({
            conference_id: parsePositive(draft.conferenceId),
            journal_id: parsePositive(draft.journalId),
            author_id: parsePositive(draft.authorId),
        });

    const clear = () => {
        setDraft({ conferenceId: "", journalId: "", authorId: "" });
        onApply({ conference_id: undefined, journal_id: undefined, author_id: undefined });
    };

    return (
        <div className="grid sm:grid-cols-4 gap-3 mb-6 items-end">
            <FilterField
                label="Conference id"
                value={draft.conferenceId}
                onChange={(value) =>
                    setDraft((previous) => ({ ...previous, conferenceId: value }))
                }
            />
            <FilterField
                label="Journal id"
                value={draft.journalId}
                onChange={(value) =>
                    setDraft((previous) => ({ ...previous, journalId: value }))
                }
            />
            <FilterField
                label="Author id"
                value={draft.authorId}
                onChange={(value) =>
                    setDraft((previous) => ({ ...previous, authorId: value }))
                }
            />
            <div className="flex gap-2">
                <Button type="button" onClick={apply} size="md">
                    Apply
                </Button>
                {(conferenceId || journalId || authorId) && (
                    <Button
                        type="button"
                        variant="tertiary"
                        onClick={clear}
                        size="md"
                    >
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}

function FilterField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-caption uppercase tracking-wide text-smoke">
                {label}
            </span>
            <Input
                type="number"
                inputMode="numeric"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="—"
                className="font-mono tabular-nums"
            />
        </label>
    );
}

function parsePositive(raw: string): number | undefined {
    if (!raw) return undefined;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : undefined;
}

function YearJournalsTab({ year, page, sort, onSortChange, onPageChange }: TabProps) {
    const query = useYearJournals(
        year,
        page,
        PAGE_SIZE,
        sort ? { order_by: sort.key, order_dir: sort.direction } : undefined,
    );
    if (query.isError) {
        return <ErrorCard error={query.error} onRetry={() => query.refetch()} />;
    }
    return (
        <PaginatedTable<YearJournalEntry>
            columns={JOURNAL_COLUMNS}
            rows={query.data?.items ?? []}
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data?.total_items ?? 0}
            isLoading={query.isPending}
            onPageChange={onPageChange}
            rowKey={(row) => row.journal_id}
            sort={sort}
            onSortChange={onSortChange}
            emptyTitle="No journals published in this year."
        />
    );
}

function YearConferencesTab({ year, page, sort, onSortChange, onPageChange }: TabProps) {
    const query = useYearConferences(
        year,
        page,
        PAGE_SIZE,
        sort ? { order_by: sort.key, order_dir: sort.direction } : undefined,
    );
    if (query.isError) {
        return <ErrorCard error={query.error} onRetry={() => query.refetch()} />;
    }
    return (
        <PaginatedTable<YearConferenceEntry>
            columns={CONFERENCE_COLUMNS}
            rows={query.data?.items ?? []}
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data?.total_items ?? 0}
            isLoading={query.isPending}
            onPageChange={onPageChange}
            rowKey={(row) => row.conference_id}
            sort={sort}
            onSortChange={onSortChange}
            emptyTitle="No conferences held in this year."
        />
    );
}

const ARTICLE_COLUMNS: PaginatedTableColumn<YearArticle>[] = [
    {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row) =>
            row.venue_type === "journal" ? (
                <Link
                    to="/journals/$journalId/articles/$articleId"
                    params={{
                        journalId: String(row.venue_id),
                        articleId: String(row.article_id),
                    }}
                    search={() => ({}) as never}
                    className="text-navy hover:text-ochre transition-colors duration-100"
                >
                    {row.title}
                </Link>
            ) : (
                <Link
                    to="/conferences/$conferenceId/articles/$articleId"
                    params={{
                        conferenceId: String(row.venue_id),
                        articleId: String(row.article_id),
                    }}
                    search={() => ({}) as never}
                    className="text-navy hover:text-ochre transition-colors duration-100"
                >
                    {row.title}
                </Link>
            ),
    },
    {
        key: "venue_title",
        header: "Venue",
        sortable: true,
        render: (row) => (
            <div className="flex items-center gap-2">
                <Badge tone={row.venue_type === "journal" ? "navy" : "ochre"}>
                    {row.venue_type === "journal" ? "Journal" : "Conference"}
                </Badge>
                {row.venue_type === "journal" ? (
                    <Link
                        to="/journals/$journalId"
                        params={{ journalId: String(row.venue_id) }}
                        search={() => ({}) as never}
                        className="hover:text-ochre transition-colors duration-100"
                    >
                        {row.venue_title}
                    </Link>
                ) : (
                    <Link
                        to="/conferences/$conferenceId"
                        params={{ conferenceId: String(row.venue_id) }}
                        search={() => ({}) as never}
                        className="hover:text-ochre transition-colors duration-100"
                    >
                        {row.venue_title}
                    </Link>
                )}
            </div>
        ),
    },
];

const JOURNAL_COLUMNS: PaginatedTableColumn<YearJournalEntry>[] = [
    {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row) => (
            <Link
                to="/journals/$journalId"
                params={{ journalId: String(row.journal_id) }}
                search={() => ({}) as never}
                className="text-navy hover:text-ochre"
            >
                {row.title}
            </Link>
        ),
    },
    {
        key: "publisher",
        header: "Publisher",
        sortable: true,
        render: (row) => row.publisher ?? "—",
    },
    {
        key: "articles_in_year",
        header: "Articles this year",
        numeric: true,
        width: "180px",
        sortable: true,
        render: (row) => formatThousands(row.articles_in_year),
    },
];

const CONFERENCE_COLUMNS: PaginatedTableColumn<YearConferenceEntry>[] = [
    {
        key: "acronym",
        header: "Acronym",
        width: "140px",
        sortable: true,
        render: (row) => (
            <Link
                to="/conferences/$conferenceId"
                params={{ conferenceId: String(row.conference_id) }}
                search={() => ({}) as never}
                className="font-mono text-navy hover:text-ochre"
            >
                {row.acronym ?? `#${row.conference_id}`}
            </Link>
        ),
    },
    {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row) => row.title,
    },
    {
        key: "articles_in_year",
        header: "Articles this year",
        numeric: true,
        width: "180px",
        sortable: true,
        render: (row) => formatThousands(row.articles_in_year),
    },
];
