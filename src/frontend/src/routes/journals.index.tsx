/**
 * Journals list route ("/journals") — filters for search text,
 * quartile, subject area and publisher; sortable columns; pagination
 * over the 1423 indexed journals.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { useJournalList } from "../api/queries";
import { SearchInput } from "../components/filters/SearchInput";
import { SelectFilter } from "../components/filters/SelectFilter";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import {
    PaginatedTable,
    type PaginatedTableColumn,
} from "../components/tables/PaginatedTable";
import { Badge } from "../components/ui/Badge";
import { formatThousands } from "../lib/formatNumber";
import type { JournalSummary } from "../api/types";

const PAGE_SIZE = 50;

const journalsSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    search_text: z.string().optional(),
    publisher: z.string().optional(),
    best_quartile: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
    best_subject_area: z.string().optional(),
    ranked_only: z.coerce.boolean().default(false),
    has_publisher: z.coerce.boolean().default(false),
    has_subject_area: z.coerce.boolean().default(false),
    order_by: z
        .enum(["title", "publisher", "best_quartile", "best_subject_area", "sjr_index"])
        .optional(),
    order_dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/journals/")({
    component: JournalsListPage,
    validateSearch: (search) => journalsSearchSchema.parse(search),
});

const QUARTILE_OPTIONS = [
    { value: "Q1", label: "Q1" },
    { value: "Q2", label: "Q2" },
    { value: "Q3", label: "Q3" },
    { value: "Q4", label: "Q4" },
];

function JournalsListPage() {
    const navigate = useNavigate({ from: Route.fullPath });
    const search = Route.useSearch();

    const listQuery = useJournalList({
        page: search.page,
        page_size: PAGE_SIZE,
        search_text: search.search_text,
        publisher: search.publisher,
        best_quartile: search.best_quartile,
        best_subject_area: search.best_subject_area,
        ranked_only: search.ranked_only,
        has_publisher: search.has_publisher,
        has_subject_area: search.has_subject_area,
        order_by: search.order_by,
        order_dir: search.order_dir,
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
                    eyebrow="Journals"
                    title="Browse journals"
                    lede={
                        listQuery.data
                            ? `${formatThousands(totalItems)} indexed across the Kaggle ranking corpus.`
                            : "Searching the Kaggle journal corpus."
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
                    <SearchInput
                        value={search.search_text ?? ""}
                        onChange={(value) =>
                            setSearch({ search_text: value || undefined })
                        }
                        placeholder="Search title…"
                    />
                    <SelectFilter
                        value={search.best_quartile}
                        onChange={(value) =>
                            setSearch({
                                best_quartile: value as
                                    | "Q1"
                                    | "Q2"
                                    | "Q3"
                                    | "Q4"
                                    | undefined,
                            })
                        }
                        options={QUARTILE_OPTIONS}
                        placeholder="All quartiles"
                        ariaLabel="Filter by quartile"
                    />
                    <SearchInput
                        value={search.publisher ?? ""}
                        onChange={(value) =>
                            setSearch({ publisher: value || undefined })
                        }
                        placeholder="Publisher contains…"
                    />
                    <SearchInput
                        value={search.best_subject_area ?? ""}
                        onChange={(value) =>
                            setSearch({ best_subject_area: value || undefined })
                        }
                        placeholder="Subject area contains…"
                    />
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-body-sm text-slate">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={search.ranked_only}
                            onChange={(event) =>
                                setSearch({ ranked_only: event.target.checked })
                            }
                            className="size-4 accent-navy"
                        />
                        Only ranked (Q1–Q4)
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={search.has_publisher}
                            onChange={(event) =>
                                setSearch({ has_publisher: event.target.checked })
                            }
                            className="size-4 accent-navy"
                        />
                        Hide rows with no publisher
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={search.has_subject_area}
                            onChange={(event) =>
                                setSearch({ has_subject_area: event.target.checked })
                            }
                            className="size-4 accent-navy"
                        />
                        Hide rows with no subject area
                    </label>
                </div>

                {listQuery.isError ? (
                    <ErrorCard
                        error={listQuery.error}
                        onRetry={() => listQuery.refetch()}
                    />
                ) : (
                    <PaginatedTable<JournalSummary>
                        columns={JOURNAL_COLUMNS}
                        rows={items}
                        page={search.page}
                        pageSize={PAGE_SIZE}
                        totalItems={totalItems}
                        isLoading={listQuery.isPending}
                        onPageChange={(nextPage) =>
                            setSearch({ page: nextPage }, { resetPage: false })
                        }
                        rowKey={(row) => row.journal_id}
                        sort={
                            search.order_by
                                ? {
                                      key: search.order_by,
                                      direction: search.order_dir ?? "asc",
                                  }
                                : undefined
                        }
                        onSortChange={(next) =>
                            setSearch({
                                order_by: next?.key as typeof search.order_by,
                                order_dir: next?.direction,
                            })
                        }
                        emptyTitle="No journals match your filters."
                        emptyDescription="Try clearing the publisher or subject-area fields, or broadening the title search."
                    />
                )}
            </PageContainer>
        </AppShell>
    );
}

const JOURNAL_COLUMNS: PaginatedTableColumn<JournalSummary>[] = [
    {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row) => (
            <Link
                to="/journals/$journalId"
                params={{ journalId: String(row.journal_id) }}
                search={() => ({}) as never}
                className="text-navy hover:text-ochre transition-colors duration-100"
            >
                {row.title}
            </Link>
        ),
    },
    {
        key: "publisher",
        header: "Publisher",
        sortable: true,
        render: (row) =>
            row.publisher ?? (
                <span className="text-smoke italic">unranked</span>
            ),
    },
    {
        key: "best_quartile",
        header: "Quartile",
        align: "center",
        width: "120px",
        sortable: true,
        render: (row) =>
            row.best_quartile ? (
                <Badge tone={quartileTone(row.best_quartile)}>{row.best_quartile}</Badge>
            ) : (
                <Badge tone="smoke">Unranked</Badge>
            ),
    },
    {
        key: "sjr_index",
        header: "SJR",
        numeric: true,
        width: "100px",
        sortable: true,
        render: (row) =>
            row.sjr_index != null ? (
                row.sjr_index.toFixed(2)
            ) : (
                <span className="text-smoke">—</span>
            ),
    },
    {
        key: "best_subject_area",
        header: "Subject area",
        sortable: true,
        render: (row) =>
            row.best_subject_area ?? (
                <span className="text-smoke italic">unranked</span>
            ),
    },
];

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
