/**
 * Authors list route ("/authors") — debounced name search, optional
 * min-articles filter, paginated table of the 1.4M-row author lookup.
 * Default sort is total_articles descending so the most prolific
 * authors surface first.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { useAuthorList } from "../api/queries";
import { SearchInput } from "../components/filters/SearchInput";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import {
    PaginatedTable,
    type PaginatedTableColumn,
} from "../components/tables/PaginatedTable";
import { formatThousands } from "../lib/formatNumber";
import type { AuthorSummary } from "../api/types";

const PAGE_SIZE = 50;

const authorsSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    name_query: z.string().optional(),
    include_silent: z.coerce.boolean().default(false),
    order_by: z
        .enum(["total_articles", "author_name", "earliest_year", "latest_year"])
        .default("total_articles"),
    order_dir: z.enum(["asc", "desc"]).default("desc"),
});

export const Route = createFileRoute("/authors/")({
    component: AuthorsListPage,
    validateSearch: (search) => authorsSearchSchema.parse(search),
});

function AuthorsListPage() {
    const navigate = useNavigate({ from: Route.fullPath });
    const search = Route.useSearch();

    const listQuery = useAuthorList({
        page: search.page,
        page_size: PAGE_SIZE,
        name_query: search.name_query,
        order_by: search.order_by,
        order_dir: search.order_dir,
        min_articles: search.include_silent ? 0 : 1,
    });

    const setSearch = (
        updates: Partial<typeof search>,
        options: { resetPage?: boolean } = { resetPage: true },
    ) => {
        navigate({
            search: (previous) => ({
                ...previous,
                ...updates,
                page: options.resetPage ? 1 : (updates.page ?? previous.page),
            }),
            replace: true,
            resetScroll: false,
        });
    };

    const totalItems = listQuery.data?.total_items ?? 0;
    const items = listQuery.data?.items ?? [];

    return (
        <AppShell>
            <PageContainer>
                <PageHeader
                    eyebrow="Authors"
                    title="Search authors"
                    lede={
                        listQuery.data
                            ? `${formatThousands(totalItems)} authors with at least one indexed publication. Toggle the box below to also include silent authors who never appeared in an indexed article.`
                            : "Browsing every author indexed by the DBLP corpus."
                    }
                />

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end mb-4">
                    <SearchInput
                        value={search.name_query ?? ""}
                        onChange={(value) =>
                            setSearch({ name_query: value || undefined })
                        }
                        placeholder="Search by name…"
                        autoFocus
                    />
                </div>

                <label className="inline-flex items-center gap-2 mb-8 text-body-sm text-slate cursor-pointer">
                    <input
                        type="checkbox"
                        checked={search.include_silent}
                        onChange={(event) =>
                            setSearch({ include_silent: event.target.checked })
                        }
                        className="size-4 accent-navy"
                    />
                    Include silent authors (no indexed articles)
                </label>

                {listQuery.isError ? (
                    <ErrorCard
                        error={listQuery.error}
                        onRetry={() => listQuery.refetch()}
                    />
                ) : (
                    <PaginatedTable<AuthorSummary>
                        columns={AUTHOR_COLUMNS}
                        rows={items}
                        page={search.page}
                        pageSize={PAGE_SIZE}
                        totalItems={totalItems}
                        isLoading={listQuery.isPending}
                        onPageChange={(nextPage) =>
                            setSearch({ page: nextPage }, { resetPage: false })
                        }
                        rowKey={(row) => row.author_id}
                        sort={{
                            key: search.order_by,
                            direction: search.order_dir,
                        }}
                        onSortChange={(next) =>
                            setSearch({
                                order_by:
                                    (next?.key as typeof search.order_by) ??
                                    "total_articles",
                                order_dir: next?.direction ?? "desc",
                            })
                        }
                        emptyTitle="No author matches that search."
                        emptyDescription="Try a partial name. The search is a substring match against the cleaned author table."
                    />
                )}
            </PageContainer>
        </AppShell>
    );
}

const AUTHOR_COLUMNS: PaginatedTableColumn<AuthorSummary>[] = [
    {
        key: "author_name",
        header: "Author",
        sortable: true,
        render: (row) => (
            <Link
                to="/authors/$authorId"
                params={{ authorId: String(row.author_id) }}
                search={() => ({}) as never}
                className="text-navy hover:text-ochre transition-colors duration-100"
            >
                {row.author_name}
            </Link>
        ),
    },
    {
        key: "author_id",
        header: "ID",
        width: "100px",
        numeric: true,
        render: (row) => `#${row.author_id}`,
    },
    {
        key: "total_articles",
        header: "Articles",
        width: "120px",
        numeric: true,
        sortable: true,
        render: (row) => formatThousands(row.total_articles),
    },
    {
        key: "earliest_year",
        header: "First year",
        width: "120px",
        numeric: true,
        sortable: true,
        render: (row) => row.earliest_year ?? "—",
    },
    {
        key: "latest_year",
        header: "Last year",
        width: "120px",
        numeric: true,
        sortable: true,
        render: (row) => row.latest_year ?? "—",
    },
];
