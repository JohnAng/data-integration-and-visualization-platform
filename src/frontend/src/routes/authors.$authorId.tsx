/**
 * Author profile route ("/authors/$authorId") — header with name,
 * total articles and year span; per-year line chart; paginated table
 * of every article authored across both fact tables.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
    useAuthorArticles,
    useAuthorProfile,
    useAuthorYearlyStatistics,
} from "../api/queries";
import { ChartFrame } from "../components/charts/ChartFrame";
import { LineChart } from "../components/charts/LineChart";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { MetadataGrid, type MetadataEntry } from "../components/layout/MetadataGrid";
import { PageHeader } from "../components/layout/PageHeader";
import {
    PaginatedTable,
    type PaginatedTableColumn,
} from "../components/tables/PaginatedTable";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { formatThousands } from "../lib/formatNumber";
import type { AuthorArticle, AuthorYearlyStatistic } from "../api/types";

const PAGE_SIZE = 25;

const authorProfileSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    order_by: z.enum(["title", "year", "venue_title", "venue_type"]).optional(),
    order_dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/authors/$authorId")({
    component: AuthorProfilePage,
    validateSearch: (search) => authorProfileSearchSchema.parse(search),
});

function AuthorProfilePage() {
    const { authorId: authorIdParam } = Route.useParams();
    const search = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const authorId = Number.parseInt(authorIdParam, 10);

    const profileQuery = useAuthorProfile(authorId);
    const yearlyQuery = useAuthorYearlyStatistics(authorId);
    const articlesSort = search.order_by
        ? { order_by: search.order_by, order_dir: search.order_dir ?? ("asc" as const) }
        : undefined;
    const articlesQuery = useAuthorArticles(
        authorId,
        {},
        search.page,
        PAGE_SIZE,
        articlesSort,
    );

    const profile = profileQuery.data;
    const articles = articlesQuery.data?.items ?? [];
    const articlesTotal = articlesQuery.data?.total_items ?? 0;

    const setPage = (page: number) =>
        navigate({
            search: (previous) => ({ ...previous, page }),
            replace: true,
            resetScroll: false,
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

    const metadata: MetadataEntry[] = profile
        ? [
              {
                  label: "Total articles",
                  value: formatThousands(profile.total_articles),
              },
              { label: "First year", value: profile.earliest_year },
              { label: "Last year", value: profile.latest_year },
              {
                  label: "Average per year",
                  value:
                      profile.average_articles_per_year != null
                          ? profile.average_articles_per_year.toFixed(2)
                          : null,
              },
          ]
        : [];

    return (
        <AppShell>
            <PageContainer>
                <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                    <Link
                        to="/authors"
                        search={() => ({ page: 1 }) as never}
                        className="hover:text-ochre"
                    >
                        ← Authors
                    </Link>
                </p>
                {profileQuery.isPending ? (
                    <Skeleton className="h-16 w-3/4 mb-12" />
                ) : (
                    <PageHeader
                        eyebrow="Author"
                        title={profile?.author_name ?? `Author #${authorIdParam}`}
                        lede={
                            profile && profile.earliest_year && profile.latest_year
                                ? `Published from ${profile.earliest_year} to ${profile.latest_year}.`
                                : null
                        }
                    />
                )}

                {profileQuery.isPending ? (
                    <Skeleton className="h-32 mb-12" />
                ) : (
                    <div className="mb-12">
                        <MetadataGrid entries={metadata} columns={2} />
                    </div>
                )}

                <section className="mb-12">
                    <h2 className="font-serif text-h2 text-navy mb-6">
                        Articles per year
                    </h2>
                    <AuthorYearlyChart
                        rows={yearlyQuery.data ?? []}
                        isLoading={yearlyQuery.isPending}
                    />
                </section>

                <section>
                    <h2 className="font-serif text-h2 text-navy mb-6">Articles</h2>
                    {articlesQuery.isError ? (
                        <ErrorCard
                            error={articlesQuery.error}
                            onRetry={() => articlesQuery.refetch()}
                        />
                    ) : (
                        <PaginatedTable<AuthorArticle>
                            columns={AUTHOR_ARTICLE_COLUMNS}
                            rows={articles}
                            page={search.page}
                            pageSize={PAGE_SIZE}
                            totalItems={articlesTotal}
                            isLoading={articlesQuery.isPending}
                            onPageChange={setPage}
                            rowKey={(row) => `${row.venue_type}-${row.article_id}`}
                            sort={
                                search.order_by
                                    ? {
                                          key: search.order_by,
                                          direction: search.order_dir ?? "asc",
                                      }
                                    : undefined
                            }
                            onSortChange={(next) =>
                                navigate({
                                    search: (previous) => ({
                                        ...previous,
                                        order_by: next?.key as typeof search.order_by,
                                        order_dir: next?.direction,
                                        page: 1,
                                    }),
                                    replace: true,
                                })
                            }
                            emptyTitle="No articles indexed for this author."
                        />
                    )}
                </section>
            </PageContainer>
        </AppShell>
    );
}

const AUTHOR_ARTICLE_COLUMNS: PaginatedTableColumn<AuthorArticle>[] = [
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
    {
        key: "year",
        header: "Year",
        numeric: true,
        width: "100px",
        sortable: true,
        render: (row) => row.year ?? "—",
    },
];

function AuthorYearlyChart({
    rows,
    isLoading,
}: {
    rows: AuthorYearlyStatistic[];
    isLoading: boolean;
}) {
    const series = rows.length
        ? [
              {
                  name: "Articles",
                  data: rows.map((row) => ({ x: row.year, y: row.articles_count })),
                  colorIndex: 0,
              },
          ]
        : [];
    return (
        <ChartFrame
            height={280}
            isLoading={isLoading}
            isEmpty={series.length === 0}
            caption="Per-year article count across journals and conferences. The backend trims a trailing partial year automatically."
        >
            {({ width, height }) => (
                <LineChart
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel="Articles"
                    series={series}
                />
            )}
        </ChartFrame>
    );
}
