/**
 * Dashboard route ("/dashboard") — at-a-glance surface with four KPI
 * tiles, a publications-over-time line chart, a top-publishers bar
 * chart and a "recent activity" table linking into the latest year's
 * articles.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import {
    useCorpusTotals,
    usePublisherQuartileChart,
    useYearArticles,
    useYearSummaries,
} from "../api/queries";
import { BarChart, type BarGroupDatum } from "../components/charts/BarChart";
import { ChartFrame } from "../components/charts/ChartFrame";
import { LineChart } from "../components/charts/LineChart";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { MetricsGrid, MetricTile } from "../components/metrics/MetricTile";
import {
    PaginatedTable,
    type PaginatedTableColumn,
} from "../components/tables/PaginatedTable";
import { Badge } from "../components/ui/Badge";
import {
    formatCompact,
    formatNullable,
    formatThousands,
} from "../lib/formatNumber";
import type { YearArticle, YearSummary } from "../api/types";

export const Route = createFileRoute("/dashboard")({
    component: DashboardPage,
});

function DashboardPage() {
    const totalsQuery = useCorpusTotals();
    const yearsQuery = useYearSummaries({});
    const quartileQuery = usePublisherQuartileChart();

    const totals = totalsQuery.data;
    // The backend already trims the trailing partial year from the
    // years summary, so the last row of yearsQuery.data is always a
    // complete year. We fall back to totals.latest_year while the
    // years query is still loading.
    const latestCompleteYear =
        (yearsQuery.data?.length ?? 0) > 0
            ? yearsQuery.data![yearsQuery.data!.length - 1].year
            : (totals?.latest_year ?? 0);
    const recentArticlesQuery = useYearArticles(latestCompleteYear, {
        page: 1,
        page_size: 10,
    });

    return (
        <AppShell>
            <PageContainer>
                <PageHeader
                    eyebrow="Dashboard"
                    title="At a glance"
                    lede="A reading-room overview of the indexed bibliographic corpus, refreshed live from the API."
                />

                <section className="mb-12">
                    <MetricsGrid columns={4}>
                        <MetricTile
                            label="Articles"
                            value={formatNullable(totals?.total_articles, formatCompact)}
                            sublabel={
                                totals != null
                                    ? `${formatThousands(totals.total_articles)} indexed`
                                    : undefined
                            }
                            isLoading={totalsQuery.isPending}
                        />
                        <MetricTile
                            label="Authors"
                            value={formatNullable(totals?.total_authors, formatCompact)}
                            sublabel={
                                totals != null
                                    ? `${formatThousands(totals.total_authors)} unique`
                                    : undefined
                            }
                            isLoading={totalsQuery.isPending}
                        />
                        <MetricTile
                            label="Journals"
                            value={formatNullable(totals?.total_journals, formatCompact)}
                            sublabel={
                                totals != null
                                    ? `${formatThousands(totals.total_journals)} indexed`
                                    : undefined
                            }
                            isLoading={totalsQuery.isPending}
                        />
                        <MetricTile
                            label="Conferences"
                            value={formatNullable(
                                totals?.total_conferences,
                                formatCompact,
                            )}
                            sublabel={
                                totals != null
                                    ? `${formatThousands(totals.total_conferences)} indexed`
                                    : undefined
                            }
                            isLoading={totalsQuery.isPending}
                        />
                    </MetricsGrid>
                </section>

                <section className="mb-12">
                    <h2 className="font-serif text-h2 text-navy mb-6">
                        Publications over time
                    </h2>
                    {yearsQuery.isError ? (
                        <ErrorCard
                            error={yearsQuery.error}
                            onRetry={() => yearsQuery.refetch()}
                        />
                    ) : (
                        <PublicationsOverTimeChart
                            rows={yearsQuery.data ?? []}
                            isLoading={yearsQuery.isPending}
                        />
                    )}
                </section>

                <section className="mb-12">
                    <h2 className="font-serif text-h2 text-navy mb-6">
                        Top publishers by quartile
                    </h2>
                    {quartileQuery.isError ? (
                        <ErrorCard
                            error={quartileQuery.error}
                            onRetry={() => quartileQuery.refetch()}
                        />
                    ) : (
                        <PublisherQuartileChart
                            rows={quartileQuery.data ?? []}
                            isLoading={quartileQuery.isPending}
                        />
                    )}
                </section>

                <section>
                    <div className="flex items-end justify-between mb-6">
                        <h2 className="font-serif text-h2 text-navy">
                            Recent activity
                        </h2>
                        {latestCompleteYear ? (
                            <Link
                                to="/years/$year"
                                params={{ year: String(latestCompleteYear) }}
                                search={() => ({ tab: "articles", page: 1 }) as never}
                                className="text-body-sm text-navy hover:text-ochre transition-colors duration-100"
                            >
                                See all in {latestCompleteYear} →
                            </Link>
                        ) : null}
                    </div>
                    {recentArticlesQuery.isError ? (
                        <ErrorCard
                            error={recentArticlesQuery.error}
                            onRetry={() => recentArticlesQuery.refetch()}
                        />
                    ) : (
                        <PaginatedTable<YearArticle>
                            columns={ARTICLE_COLUMNS}
                            rows={recentArticlesQuery.data?.items ?? []}
                            page={1}
                            pageSize={10}
                            totalItems={
                                Math.min(
                                    10,
                                    recentArticlesQuery.data?.total_items ?? 0,
                                )
                            }
                            isLoading={recentArticlesQuery.isPending}
                            onPageChange={() => undefined}
                            rowKey={(row) => `${row.venue_type}-${row.article_id}`}
                            emptyTitle="No recent articles available."
                        />
                    )}
                </section>
            </PageContainer>
        </AppShell>
    );
}

function PublicationsOverTimeChart({
    rows,
    isLoading,
}: {
    rows: YearSummary[];
    isLoading: boolean;
}) {
    const series = rows.length
        ? [
              {
                  name: "Total articles",
                  colorIndex: 0,
                  data: rows.map((row) => ({
                      x: row.year,
                      y: row.total_articles,
                  })),
              },
              {
                  name: "Journal articles",
                  colorIndex: 1,
                  data: rows.map((row) => ({
                      x: row.year,
                      y: row.journal_articles,
                  })),
              },
              {
                  name: "Conference articles",
                  colorIndex: 2,
                  data: rows.map((row) => ({
                      x: row.year,
                      y: row.conference_articles,
                  })),
              },
          ]
        : [];
    return (
        <ChartFrame
            height={360}
            isLoading={isLoading}
            isEmpty={series.length === 0}
            caption="Journal articles, conference articles and combined totals per year. The backend trims a trailing partial year automatically."
            legend={[
                { label: "Total" },
                { label: "Journals" },
                { label: "Conferences" },
            ]}
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

function PublisherQuartileChart({
    rows,
    isLoading,
}: {
    rows: { publisher: string; best_quartile: string | null; journal_count: number }[];
    isLoading: boolean;
}) {
    const data: BarGroupDatum[] = useMemo(() => {
        const totalsByPublisher = new Map<string, number>();
        for (const row of rows) {
            totalsByPublisher.set(
                row.publisher,
                (totalsByPublisher.get(row.publisher) ?? 0) + row.journal_count,
            );
        }
        const topPublishers = Array.from(totalsByPublisher.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([publisher]) => publisher);
        const quartileToColor: Record<string, number> = {
            Q1: 3,
            Q2: 0,
            Q3: 1,
            Q4: 2,
        };
        return topPublishers.map((publisher) => ({
            category: shortenPublisher(publisher),
            values: ["Q1", "Q2", "Q3", "Q4"].map((quartile, index) => ({
                seriesName: quartile,
                value:
                    rows.find(
                        (row) =>
                            row.publisher === publisher &&
                            row.best_quartile === quartile,
                    )?.journal_count ?? 0,
                colorIndex: quartileToColor[quartile] ?? index,
            })),
        }));
    }, [rows]);

    return (
        <ChartFrame
            height={400}
            isLoading={isLoading}
            isEmpty={data.length === 0}
            caption="Top ten publishers by total indexed journals, broken down by best journal quartile (Q1 sage, Q2 navy, Q3 ochre, Q4 oxblood)."
            legend={[
                { label: "Q1", colorIndex: 3 },
                { label: "Q2", colorIndex: 0 },
                { label: "Q3", colorIndex: 1 },
                { label: "Q4", colorIndex: 2 },
            ]}
        >
            {({ width, height }) => (
                <BarChart
                    data={data}
                    width={width}
                    height={height}
                    xLabel="Publisher"
                    yLabel="Journals"
                />
            )}
        </ChartFrame>
    );
}

function shortenPublisher(publisher: string): string {
    if (publisher.length <= 24) {
        return publisher;
    }
    return `${publisher.slice(0, 22)}…`;
}

const ARTICLE_COLUMNS: PaginatedTableColumn<YearArticle>[] = [
    {
        key: "title",
        header: "Title",
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
