/**
 * Conference profile route ("/conferences/$conferenceId") — header
 * with acronym, rank value and FoR description; aggregate stats grid;
 * year-range filter that recomputes everything downstream; per-year
 * line chart; paginated table of papers.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
    useConferenceArticles,
    useConferenceProfile,
    useConferenceYearlyStatistics,
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
import { deriveConferenceAcronym } from "../lib/dataQuality";
import { formatThousands } from "../lib/formatNumber";
import type { ConferenceArticle, ConferenceYearlyStatistic } from "../api/types";

const PAGE_SIZE = 25;

const conferenceProfileSearchSchema = z.object({
    start_year: z.coerce.number().int().min(1900).max(2100).optional(),
    end_year: z.coerce.number().int().min(1900).max(2100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    order_by: z.enum(["title", "year", "pages"]).optional(),
    order_dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/conferences/$conferenceId/")({
    component: ConferenceProfilePage,
    validateSearch: (search) => conferenceProfileSearchSchema.parse(search),
});

function ConferenceProfilePage() {
    const { conferenceId: conferenceIdParam } = Route.useParams();
    const search = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const conferenceId = Number.parseInt(conferenceIdParam, 10);

    const range = { start_year: search.start_year, end_year: search.end_year };
    const profileQuery = useConferenceProfile(conferenceId, range);
    const yearlyQuery = useConferenceYearlyStatistics(conferenceId, range);
    const articlesSort = search.order_by
        ? { order_by: search.order_by, order_dir: search.order_dir ?? "asc" as const }
        : undefined;
    const articlesQuery = useConferenceArticles(
        conferenceId,
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

    const acronymDisplay = profile
        ? deriveConferenceAcronym(profile.acronym, profile.title)
        : null;

    const metadata: MetadataEntry[] = profile
        ? [
              { label: "Acronym", value: acronymDisplay },
              {
                  label: "Rank",
                  value: profile.rank_value ? (
                      <Badge tone={rankTone(profile.rank_value)}>
                          {profile.rank_value}
                      </Badge>
                  ) : null,
              },
              {
                  label: "Primary Field of Research",
                  value:
                      profile.primary_for_description ??
                      (profile.primary_for
                          ? `FoR ${profile.primary_for}`
                          : null),
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
              {
                  label: "Avg authors / article",
                  value:
                      profile.average_authors_per_article_overall != null
                          ? profile.average_authors_per_article_overall.toFixed(2)
                          : null,
              },
          ]
        : [];

    return (
        <AppShell>
            <PageContainer>
                <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                    <Link
                        to="/conferences"
                        search={() => ({ page: 1 }) as never}
                        className="hover:text-ochre"
                    >
                        ← Conferences
                    </Link>
                </p>
                {profileQuery.isPending ? (
                    <Skeleton className="h-16 w-3/4 mb-12" />
                ) : (
                    <PageHeader
                        eyebrow={
                            profile?.rank_value
                                ? `Conference · ${profile.rank_value}`
                                : "Conference"
                        }
                        title={profile?.title ?? `Conference #${conferenceIdParam}`}
                        lede={
                            profile?.primary_for_description
                                ? `Field: ${profile.primary_for_description}.`
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
                    <ConferenceYearlyChart
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
                        <PaginatedTable<ConferenceArticle>
                            columns={makeArticleColumns(conferenceIdParam)}
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

function makeArticleColumns(conferenceId: string): PaginatedTableColumn<ConferenceArticle>[] {
    return [
        {
            key: "title",
            header: "Title",
            sortable: true,
            render: (row) => (
                <Link
                    to="/conferences/$conferenceId/articles/$articleId"
                    params={{
                        conferenceId,
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
            render: (row) => row.pages ?? "—",
        },
    ];
}

function ConferenceYearlyChart({
    rows,
    isLoading,
}: {
    rows: ConferenceYearlyStatistic[];
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

function rankTone(
    rank: string,
): "sage" | "navy" | "ochre" | "oxblood" | "smoke" {
    switch (rank) {
        case "A*":
            return "sage";
        case "A":
            return "navy";
        case "B":
            return "ochre";
        case "C":
            return "oxblood";
        default:
            return "smoke";
    }
}
