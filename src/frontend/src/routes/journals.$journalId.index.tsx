/**
 * Journal profile route ("/journals/$journalId") — header with full
 * Kaggle ranking (SJR, H-index, cite score…); aggregate stats grid;
 * year-range filter that recomputes every aggregate downstream;
 * per-year line chart; paginated table of articles.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
    useJournalArticles,
    useJournalProfile,
    useJournalYearlyStatistics,
} from "../api/queries";
import { ChartFrame } from "../components/charts/ChartFrame";
import { LineChart } from "../components/charts/LineChart";
import { YearRangeFilter } from "../components/filters/YearRangeFilter";
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
import type { JournalArticle, JournalYearlyStatistic } from "../api/types";

const PAGE_SIZE = 25;

const journalProfileSearchSchema = z.object({
    start_year: z.coerce.number().int().min(1900).max(2100).optional(),
    end_year: z.coerce.number().int().min(1900).max(2100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    order_by: z.enum(["title", "year", "pages"]).optional(),
    order_dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/journals/$journalId/")({
    component: JournalProfilePage,
    validateSearch: (search) => journalProfileSearchSchema.parse(search),
});

function JournalProfilePage() {
    const { journalId: journalIdParam } = Route.useParams();
    const search = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const journalId = Number.parseInt(journalIdParam, 10);

    const range = { start_year: search.start_year, end_year: search.end_year };
    const profileQuery = useJournalProfile(journalId, range);
    const yearlyQuery = useJournalYearlyStatistics(journalId, range);
    const articlesSort = search.order_by
        ? { order_by: search.order_by, order_dir: search.order_dir ?? "asc" as const }
        : undefined;
    const articlesQuery = useJournalArticles(
        journalId,
        range,
        search.page,
        PAGE_SIZE,
        articlesSort,
    );

    const profile = profileQuery.data;
    const articlesTotal = articlesQuery.data?.total_items ?? 0;
    const articles = articlesQuery.data?.items ?? [];

    const setSearch = (updates: Partial<typeof search>) =>
        navigate({
            search: (previous) => ({ ...previous, ...updates, page: 1 }),
            replace: true,
            resetScroll: false,
        });

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
              { label: "Publisher", value: profile.publisher },
              { label: "Country", value: profile.country },
              {
                  label: "Quartile",
                  value: profile.best_quartile ? (
                      <Badge tone={quartileTone(profile.best_quartile)}>
                          {profile.best_quartile}
                      </Badge>
                  ) : null,
              },
              { label: "Subject area", value: profile.best_subject_area },
              {
                  label: "SJR index",
                  value:
                      profile.sjr_index != null
                          ? profile.sjr_index.toFixed(3)
                          : null,
              },
              {
                  label: "Cite Score",
                  value:
                      profile.citation_score != null
                          ? profile.citation_score.toFixed(2)
                          : null,
              },
              { label: "H-index", value: profile.h_index },
              {
                  label: "Total documents",
                  value:
                      profile.total_documents != null
                          ? formatThousands(profile.total_documents)
                          : null,
              },
              {
                  label: "Articles in corpus",
                  value: formatThousands(profile.total_articles),
              },
              {
                  label: "Distinct authors",
                  value: formatThousands(profile.distinct_authors_total),
              },
              {
                  label: "Year span",
                  value:
                      profile.earliest_year && profile.latest_year
                          ? `${profile.earliest_year}–${profile.latest_year}`
                          : null,
              },
              {
                  label: "Avg articles / year",
                  value:
                      profile.average_articles_per_year != null
                          ? profile.average_articles_per_year.toFixed(1)
                          : null,
              },
          ]
        : [];

    return (
        <AppShell>
            <PageContainer>
                <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                    <Link
                        to="/journals"
                        search={() => ({ page: 1 }) as never}
                        className="hover:text-ochre"
                    >
                        ← Journals
                    </Link>
                </p>
                {profileQuery.isPending ? (
                    <Skeleton className="h-16 w-3/4 mb-12" />
                ) : (
                    <PageHeader
                        eyebrow={
                            profile?.best_quartile
                                ? `Journal · ${profile.best_quartile}`
                                : "Journal"
                        }
                        title={profile?.title ?? `Journal #${journalIdParam}`}
                        lede={
                            profile
                                ? `Published by ${profile.publisher ?? "an unknown publisher"}${
                                      profile.country ? ` from ${profile.country}` : ""
                                  }.`
                                : null
                        }
                    />
                )}

                {profileQuery.isPending ? (
                    <Skeleton className="h-48 mb-12" />
                ) : (
                    <div className="mb-12">
                        <MetadataGrid entries={metadata} columns={3} />
                    </div>
                )}

                <section className="mb-12">
                    <p className="text-caption uppercase tracking-wide text-smoke mb-4">
                        Year range filter
                    </p>
                    <YearRangeFilter
                        startYear={search.start_year}
                        endYear={search.end_year}
                        minYear={profile?.earliest_year ?? undefined}
                        maxYear={profile?.latest_year ?? undefined}
                        onApply={(next) =>
                            setSearch({
                                start_year: next.startYear,
                                end_year: next.endYear,
                            })
                        }
                    />
                </section>

                <section className="mb-12">
                    <h2 className="font-serif text-h2 text-navy mb-6">
                        Articles per year
                    </h2>
                    <JournalYearlyChart
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
                        <PaginatedTable<JournalArticle>
                            columns={makeArticleColumns(journalIdParam)}
                            rows={articles}
                            page={search.page}
                            pageSize={PAGE_SIZE}
                            totalItems={articlesTotal}
                            isLoading={articlesQuery.isPending}
                            onPageChange={setPage}
                            rowKey={(row) => row.article_id}
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
                            emptyTitle="No articles within this year range."
                            emptyDescription="Try widening the filter above to capture more years."
                        />
                    )}
                </section>
            </PageContainer>
        </AppShell>
    );
}

function makeArticleColumns(journalId: string): PaginatedTableColumn<JournalArticle>[] {
    return [
        {
            key: "title",
            header: "Title",
            sortable: true,
            render: (row) => (
                <Link
                    to="/journals/$journalId/articles/$articleId"
                    params={{
                        journalId,
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
            key: "year",
            header: "Year",
            numeric: true,
            width: "100px",
            sortable: true,
            render: (row) => row.year ?? "—",
        },
        {
            key: "pages",
            header: "Pages",
            width: "120px",
            sortable: true,
            render: (row) => row.pages ?? "—",
        },
    ];
}

function JournalYearlyChart({
    rows,
    isLoading,
}: {
    rows: JournalYearlyStatistic[];
    isLoading: boolean;
}) {
    const series = rows.length
        ? [
              {
                  name: "Articles",
                  data: rows.map((row) => ({ x: row.year, y: row.articles_count })),
                  colorIndex: 0,
              },
              {
                  name: "Distinct authors",
                  data: rows.map((row) => ({
                      x: row.year,
                      y: row.distinct_authors,
                  })),
                  colorIndex: 1,
              },
              {
                  name: "Total authors",
                  data: rows.map((row) => ({
                      x: row.year,
                      y: row.total_authors,
                  })),
                  colorIndex: 2,
              },
          ]
        : [];
    return (
        <ChartFrame
            height={320}
            isLoading={isLoading}
            isEmpty={series.length === 0}
            caption="Articles, distinct authors and total authorships within the selected year range. The backend trims a trailing partial year automatically."
            legend={[
                { label: "Articles" },
                { label: "Distinct authors" },
                { label: "Total authors" },
            ]}
        >
            {({ width, height }) => (
                <LineChart
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel="Count"
                    series={series}
                />
            )}
        </ChartFrame>
    );
}

function quartileTone(
    quartile: string,
): "sage" | "navy" | "ochre" | "oxblood" | "smoke" {
    switch (quartile) {
        case "Q1":
            return "sage";
        case "Q2":
            return "navy";
        case "Q3":
            return "ochre";
        case "Q4":
            return "oxblood";
        default:
            return "smoke";
    }
}
