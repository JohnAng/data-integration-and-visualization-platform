/**
 * VenuePicker — scrolling browse list with an inline filter, used to
 * pick up to 20 journals or conferences for the venue-comparison and
 * venue-metrics charts on /charts. Calls the backend list endpoints
 * directly so the user sees real venue names instead of numeric IDs.
 */
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { useConferenceList, useJournalList } from "../../api/queries";
import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "../../lib/cn";
import { SearchInput } from "./SearchInput";

interface VenuePickerProps {
    venueType: "journal" | "conference";
    selected: number[];
    onChange: (next: number[]) => void;
    maximumSelections?: number;
}

interface VenueOption {
    id: number;
    title: string;
    secondary?: string | null;
}

const BROWSE_PAGE_SIZE = 200;

/**
 * Multi-select venue picker driving the chart playground.
 *
 * Always presents a scrolling list of venues so users can browse
 * without having to type. The default view is sorted by title and
 * shows the first 200 items; the optional search input narrows the
 * visible list to titles matching the typed substring. Selected
 * venues stay visible as removable chips above the list even after
 * they fall out of the current search, so analysts can curate a
 * working set across multiple queries.
 */
export function VenuePicker({
    venueType,
    selected,
    onChange,
    maximumSelections = 20,
}: VenuePickerProps) {
    const [searchText, setSearchText] = useState("");
    const debouncedSearch = useDebounce(searchText, 250);

    const journalQuery = useJournalList(
        {
            search_text: debouncedSearch || undefined,
            page_size: BROWSE_PAGE_SIZE,
            ranked_only: !debouncedSearch,
            order_by: debouncedSearch ? "title" : "best_quartile",
            order_dir: "asc",
        },
        { enabled: venueType === "journal" },
    );
    const conferenceQuery = useConferenceList(
        {
            search_text: debouncedSearch || undefined,
            page_size: BROWSE_PAGE_SIZE,
            ranked_only: !debouncedSearch,
            order_by: debouncedSearch ? "title" : "rank_value",
            order_dir: "asc",
        },
        { enabled: venueType === "conference" },
    );

    const options: VenueOption[] = useMemo(() => {
        if (venueType === "journal") {
            return (journalQuery.data?.items ?? []).map((journal) => ({
                id: journal.journal_id,
                title: journal.title,
                secondary: journal.publisher,
            }));
        }
        return (conferenceQuery.data?.items ?? []).map((conference) => ({
            id: conference.conference_id,
            title: conference.title,
            secondary: conference.acronym,
        }));
    }, [venueType, journalQuery.data, conferenceQuery.data]);

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const toggle = (id: number) => {
        if (selectedSet.has(id)) {
            onChange(selected.filter((value) => value !== id));
            return;
        }
        if (selected.length >= maximumSelections) return;
        onChange([...selected, id]);
    };

    const remove = (id: number) => {
        onChange(selected.filter((value) => value !== id));
    };

    const clearAll = () => onChange([]);

    const isLoading =
        venueType === "journal" ? journalQuery.isPending : conferenceQuery.isPending;

    const totalAvailable =
        venueType === "journal"
            ? (journalQuery.data?.total_items ?? 0)
            : (conferenceQuery.data?.total_items ?? 0);

    const selectedDetails: VenueOption[] = useMemo(() => {
        const byId = new Map<number, VenueOption>();
        for (const option of options) {
            byId.set(option.id, option);
        }
        return selected.map(
            (id) => byId.get(id) ?? { id, title: `#${id}`, secondary: null },
        );
    }, [options, selected]);

    return (
        <div className="space-y-3">
            <SearchInput
                value={searchText}
                onChange={setSearchText}
                placeholder={
                    venueType === "journal"
                        ? "Filter journals by name…"
                        : "Filter conferences by name or acronym…"
                }
            />

            {selected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {selectedDetails.map((venue) => (
                        <button
                            key={venue.id}
                            type="button"
                            onClick={() => remove(venue.id)}
                            className="inline-flex items-center gap-1 max-w-full px-2 py-1 bg-parchment border border-hairline rounded-sm text-body-sm text-ink hover:bg-linen hover:border-ochre transition-colors duration-100"
                            title={`Remove ${venue.title}`}
                        >
                            <span className="truncate font-mono tabular-nums text-smoke text-caption">
                                #{venue.id}
                            </span>
                            <span className="truncate">{venue.title}</span>
                            <X
                                className="size-3 text-smoke shrink-0"
                                strokeWidth={1.5}
                            />
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={clearAll}
                        className="text-caption uppercase tracking-wide text-smoke hover:text-ochre transition-colors duration-100 px-1"
                    >
                        Clear
                    </button>
                </div>
            ) : null}

            <div className="max-h-80 overflow-y-auto border border-hairline bg-cream divide-y divide-hairline">
                {isLoading ? (
                    <p className="px-3 py-2 text-body-sm text-smoke italic">
                        Loading venues…
                    </p>
                ) : options.length === 0 ? (
                    <p className="px-3 py-2 text-body-sm text-smoke italic">
                        No matches. Try a shorter filter.
                    </p>
                ) : (
                    options.map((option) => {
                        const isSelected = selectedSet.has(option.id);
                        const disabled =
                            !isSelected && selected.length >= maximumSelections;
                        return (
                            <label
                                key={option.id}
                                className={cn(
                                    "flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors duration-100",
                                    disabled
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:bg-parchment",
                                    isSelected && "bg-parchment/70",
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggle(option.id)}
                                    disabled={disabled}
                                    className="mt-1 size-4 accent-navy"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-body-sm text-ink truncate">
                                        {option.title}
                                    </p>
                                    {option.secondary ? (
                                        <p className="text-caption uppercase tracking-wide text-smoke truncate">
                                            {option.secondary}
                                        </p>
                                    ) : null}
                                </div>
                                <span className="font-mono tabular-nums text-caption text-smoke shrink-0">
                                    #{option.id}
                                </span>
                            </label>
                        );
                    })
                )}
            </div>

            <p className="text-caption uppercase tracking-wide text-smoke flex items-center justify-between">
                <span>
                    {selected.length} / {maximumSelections} selected
                </span>
                {!isLoading && totalAvailable > options.length ? (
                    <span>
                        Showing {options.length} of {totalAvailable.toLocaleString()} —
                        filter to narrow
                    </span>
                ) : null}
            </p>
        </div>
    );
}
