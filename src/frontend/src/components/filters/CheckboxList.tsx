/**
 * CheckboxList — scrolling multi-select with optional inline search and
 * an X-icon to clear the selection. Used on /charts for subject-area,
 * Field-of-Research and publisher checkbox panels.
 */
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "../../lib/cn";
import { SearchInput } from "./SearchInput";

export interface CheckboxListOption {
    value: string;
    label: string;
    secondary?: string | null;
}

interface CheckboxListProps {
    options: CheckboxListOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    isLoading?: boolean;
    searchPlaceholder?: string;
    maxHeightClassName?: string;
    maximumSelections?: number;
    emptyMessage?: string;
}

/**
 * Generic scrolling multi-select that drives several picker surfaces.
 *
 * Renders the supplied options in a scroll container so the user can
 * browse without typing. The optional search input filters the visible
 * options by substring match on label / secondary text — the parent
 * still owns the options array, so server-side filtering is up to it.
 * Selected items stay visible as removable chips above the list, even
 * when the search filter would hide them, so analysts can curate a
 * working set across multiple queries.
 */
export function CheckboxList({
    options,
    selected,
    onChange,
    isLoading = false,
    searchPlaceholder = "Filter…",
    maxHeightClassName = "max-h-80",
    maximumSelections,
    emptyMessage = "No matches. Try a shorter filter.",
}: CheckboxListProps) {
    const [searchText, setSearchText] = useState("");
    const debouncedSearch = useDebounce(searchText.toLowerCase(), 150);

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const filtered = useMemo(() => {
        if (!debouncedSearch) return options;
        return options.filter((option) => {
            const haystack = `${option.label} ${option.secondary ?? ""}`.toLowerCase();
            return haystack.includes(debouncedSearch);
        });
    }, [options, debouncedSearch]);

    const selectedDetails: CheckboxListOption[] = useMemo(() => {
        const byValue = new Map<string, CheckboxListOption>();
        for (const option of options) {
            byValue.set(option.value, option);
        }
        return selected.map(
            (value) =>
                byValue.get(value) ?? { value, label: value, secondary: null },
        );
    }, [options, selected]);

    const toggle = (value: string) => {
        if (selectedSet.has(value)) {
            onChange(selected.filter((entry) => entry !== value));
            return;
        }
        if (
            maximumSelections != null &&
            selected.length >= maximumSelections
        ) {
            return;
        }
        onChange([...selected, value]);
    };

    const remove = (value: string) =>
        onChange(selected.filter((entry) => entry !== value));

    const clearAll = () => onChange([]);

    return (
        <div className="space-y-3">
            <SearchInput
                value={searchText}
                onChange={setSearchText}
                placeholder={searchPlaceholder}
            />

            {selected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {selectedDetails.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => remove(option.value)}
                            className="inline-flex items-center gap-1 max-w-full px-2 py-1 bg-parchment border border-hairline rounded-sm text-body-sm text-ink hover:bg-linen hover:border-ochre transition-colors duration-100"
                            title={`Remove ${option.label}`}
                        >
                            <span className="truncate">{option.label}</span>
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

            <div
                className={cn(
                    "overflow-y-auto border border-hairline bg-cream divide-y divide-hairline",
                    maxHeightClassName,
                )}
            >
                {isLoading ? (
                    <p className="px-3 py-2 text-body-sm text-smoke italic">
                        Loading…
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="px-3 py-2 text-body-sm text-smoke italic">
                        {emptyMessage}
                    </p>
                ) : (
                    filtered.map((option) => {
                        const isSelected = selectedSet.has(option.value);
                        const disabled =
                            !isSelected &&
                            maximumSelections != null &&
                            selected.length >= maximumSelections;
                        return (
                            <label
                                key={option.value}
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
                                    onChange={() => toggle(option.value)}
                                    disabled={disabled}
                                    className="mt-1 size-4 accent-navy"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-body-sm text-ink truncate">
                                        {option.label}
                                    </p>
                                    {option.secondary ? (
                                        <p className="text-caption uppercase tracking-wide text-smoke truncate">
                                            {option.secondary}
                                        </p>
                                    ) : null}
                                </div>
                            </label>
                        );
                    })
                )}
            </div>

            <p className="text-caption uppercase tracking-wide text-smoke">
                {selected.length}
                {maximumSelections != null
                    ? ` / ${maximumSelections} selected`
                    : " selected"}
            </p>
        </div>
    );
}
