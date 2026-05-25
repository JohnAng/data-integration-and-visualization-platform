/**
 * Years list route ("/years") — three-series line chart spanning the
 * corpus (journal vs conference vs total articles per year) above a
 * sortable, linkable table with one row per indexed year.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useYearSummaries } from "../api/queries";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import {
    PaginatedTable,
    type PaginatedTableColumn,
} from "../components/tables/PaginatedTable";
import { formatThousands } from "../lib/formatNumber";
import type { YearSummary } from "../api/types";

type SortKey =
    | "year"
    | "journal_articles"
    | "conference_articles"
    | "total_articles"
    | "distinct_journals"
    | "distinct_conferences"
    | "distinct_authors";

export const Route = createFileRoute("/years/")({
    component: YearsListPage,
});

function YearsListPage() {
    const summariesQuery = useYearSummaries({});
    const summaries = summariesQuery.data ?? [];
    const totalItems = summaries.length;
    const [sort, setSort] = useState<
        { key: SortKey; direction: "asc" | "desc" } | undefined
    >({ key: "year", direction: "desc" });

    const sortedRows = useMemo(() => {
        if (!sort) return summaries;
        const direction = sort.direction === "asc" ? 1 : -1;
        const key = sort.key;
        return [...summaries].sort(
            (a, b) => ((a[key] ?? 0) - (b[key] ?? 0)) * direction,
        );
    }, [summaries, sort]);

    const totalArticlesAllYears = summaries.reduce(
        (sum, row) => sum + row.total_articles,
        0,
    );

    return (
        <AppShell>
            <PageContainer>
                <PageHeader
                    eyebrow="Years"
                    title="Publications by year"
                    lede={
                        summariesQuery.data
                            ? `${formatThousands(totalItems)} years with at least one indexed article (${formatThousands(totalArticlesAllYears)} articles in total).`
                            : "Loading the per-year aggregate timeseries."
                    }
                />

                {summariesQuery.isError ? (
                    <ErrorCard
                        error={summariesQuery.error}
                        onRetry={() => summariesQuery.refetch()}
                    />
                ) : (
                    <PaginatedTable<YearSummary>
                        columns={YEAR_COLUMNS}
                        rows={sortedRows}
                        page={1}
                        pageSize={Math.max(1, totalItems)}
                        totalItems={totalItems}
                        isLoading={summariesQuery.isPending}
                        onPageChange={() => undefined}
                        rowKey={(row) => row.year}
                        sort={sort}
                        onSortChange={(next) =>
                            setSort(
                                next
                                    ? {
                                          key: next.key as SortKey,
                                          direction: next.direction,
                                      }
                                    : undefined,
                            )
                        }
                        emptyTitle="No year summaries available."
                    />
                )}
            </PageContainer>
        </AppShell>
    );
}

const YEAR_COLUMNS: PaginatedTableColumn<YearSummary>[] = [
    {
        key: "year",
        header: "Year",
        width: "120px",
        sortable: true,
        render: (row) => (
            <Link
                to="/years/$year"
                params={{ year: String(row.year) }}
                search={() => ({}) as never}
                className="font-mono text-navy hover:text-ochre transition-colors duration-100"
            >
                {row.year}
            </Link>
        ),
    },
    {
        key: "journal_articles",
        header: "Journal articles",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.journal_articles),
    },
    {
        key: "conference_articles",
        header: "Conference articles",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.conference_articles),
    },
    {
        key: "total_articles",
        header: "Total",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.total_articles),
    },
    {
        key: "distinct_journals",
        header: "Journals",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.distinct_journals),
    },
    {
        key: "distinct_conferences",
        header: "Conferences",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.distinct_conferences),
    },
    {
        key: "distinct_authors",
        header: "Authors",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.distinct_authors),
    },
];
