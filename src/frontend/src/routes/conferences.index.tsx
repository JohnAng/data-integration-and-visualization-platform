/**
 * Conferences list route ("/conferences") — filters for search text,
 * rank value and primary FoR; sortable columns; pagination over the
 * 5566 indexed conferences.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { useConferenceList } from "../api/queries";
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
import { deriveConferenceAcronym } from "../lib/dataQuality";
import { formatThousands } from "../lib/formatNumber";
import type { ConferenceSummary } from "../api/types";

const PAGE_SIZE = 50;

const conferencesSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    search_text: z.string().optional(),
    rank_value: z.enum(["A*", "A", "B", "C", "Multiconference"]).optional(),
    primary_for: z.string().optional(),
    ranked_only: z.coerce.boolean().default(false),
    has_acronym: z.coerce.boolean().default(false),
    has_for: z.coerce.boolean().default(false),
    order_by: z
        .enum(["title", "acronym", "rank_value", "primary_for"])
        .optional(),
    order_dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/conferences/")({
    component: ConferencesListPage,
    validateSearch: (search) => conferencesSearchSchema.parse(search),
});

const RANK_OPTIONS = [
    { value: "A*", label: "A*" },
    { value: "A", label: "A" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
    { value: "Multiconference", label: "Multiconference" },
];

function ConferencesListPage() {
    const navigate = useNavigate({ from: Route.fullPath });
    const search = Route.useSearch();

    const listQuery = useConferenceList({
        page: search.page,
        page_size: PAGE_SIZE,
        search_text: search.search_text,
        rank_value: search.rank_value,
        primary_for: search.primary_for,
        ranked_only: search.ranked_only,
        has_acronym: search.has_acronym,
        has_for: search.has_for,
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
                    eyebrow="Conferences"
                    title="Browse conferences"
                    lede={
                        listQuery.data
                            ? `${formatThousands(totalItems)} indexed across the iCore26 ranking corpus.`
                            : "Searching the iCore26 conference corpus."
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
                    <SearchInput
                        value={search.search_text ?? ""}
                        onChange={(value) =>
                            setSearch({ search_text: value || undefined })
                        }
                        placeholder="Search title or acronym…"
                    />
                    <SelectFilter
                        value={search.rank_value}
                        onChange={(value) =>
                            setSearch({
                                rank_value: value as typeof search.rank_value,
                            })
                        }
                        options={RANK_OPTIONS}
                        placeholder="All ranks"
                        ariaLabel="Filter by rank"
                    />
                    <SearchInput
                        value={search.primary_for ?? ""}
                        onChange={(value) =>
                            setSearch({ primary_for: value || undefined })
                        }
                        placeholder="Field of Research (code or words)…"
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
                        Only iCore-ranked (A* / A / B / C)
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={search.has_acronym}
                            onChange={(event) =>
                                setSearch({ has_acronym: event.target.checked })
                            }
                            className="size-4 accent-navy"
                        />
                        Hide rows with no acronym
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={search.has_for}
                            onChange={(event) =>
                                setSearch({ has_for: event.target.checked })
                            }
                            className="size-4 accent-navy"
                        />
                        Hide rows with no Field of Research
                    </label>
                </div>

                {listQuery.isError ? (
                    <ErrorCard
                        error={listQuery.error}
                        onRetry={() => listQuery.refetch()}
                    />
                ) : (
                    <PaginatedTable<ConferenceSummary>
                        columns={CONFERENCE_COLUMNS}
                        rows={items}
                        page={search.page}
                        pageSize={PAGE_SIZE}
                        totalItems={totalItems}
                        isLoading={listQuery.isPending}
                        onPageChange={(nextPage) =>
                            setSearch({ page: nextPage }, { resetPage: false })
                        }
                        rowKey={(row) => row.conference_id}
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
                        emptyTitle="No conferences match your filters."
                        emptyDescription="Try clearing the rank or Field of Research filter, or broadening the search."
                    />
                )}
            </PageContainer>
        </AppShell>
    );
}

const CONFERENCE_COLUMNS: PaginatedTableColumn<ConferenceSummary>[] = [
    {
        key: "acronym",
        header: "Acronym",
        width: "140px",
        sortable: true,
        render: (row) => {
            const acronym = deriveConferenceAcronym(row.acronym, row.title);
            return acronym ? (
                <Link
                    to="/conferences/$conferenceId"
                    params={{ conferenceId: String(row.conference_id) }}
                    search={() => ({}) as never}
                    className="font-mono text-navy hover:text-ochre transition-colors duration-100"
                >
                    {acronym}
                </Link>
            ) : (
                <span className="text-smoke italic">none</span>
            );
        },
    },
    {
        key: "title",
        header: "Title",
        sortable: true,
        render: (row) => (
            <Link
                to="/conferences/$conferenceId"
                params={{ conferenceId: String(row.conference_id) }}
                search={() => ({}) as never}
                className="text-navy hover:text-ochre transition-colors duration-100"
            >
                {row.title}
            </Link>
        ),
    },
    {
        key: "rank_value",
        header: "Rank",
        align: "center",
        width: "150px",
        sortable: true,
        render: (row) =>
            row.rank_value ? (
                <Badge tone={rankTone(row.rank_value)}>{row.rank_value}</Badge>
            ) : (
                <Badge tone="smoke">Unranked</Badge>
            ),
    },
    {
        key: "primary_for",
        header: "Field of Research",
        sortable: true,
        render: (row) =>
            row.primary_for_description ??
            (row.primary_for ? `FoR ${row.primary_for}` : (
                <span className="text-smoke italic">not in iCore26</span>
            )),
    },
];

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
