/**
 * YearRangeFilter — two numeric inputs plus an Apply button that write
 * start_year / end_year search params. Sits at the top of every profile
 * page so the year range filter recomputes every aggregate downstream
 * (the brief explicitly mandates a filtered-profile surface).
 */
import { useEffect, useState } from "react";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface YearRangeFilterProps {
    startYear: number | undefined;
    endYear: number | undefined;
    minYear?: number;
    maxYear?: number;
    onApply: (range: { startYear: number | undefined; endYear: number | undefined }) => void;
}

/**
 * Two-field year range filter with explicit Apply and Clear actions.
 * Editing the inputs only updates local state; the parent only sees
 * the new range on Apply, so the URL and refetches do not churn while
 * the user is typing.
 */
export function YearRangeFilter({
    startYear,
    endYear,
    minYear = 1900,
    maxYear = 2100,
    onApply,
}: YearRangeFilterProps) {
    const startDefault = (startYear ?? minYear).toString();
    const endDefault = (endYear ?? maxYear).toString();
    const [startDraft, setStartDraft] = useState(startDefault);
    const [endDraft, setEndDraft] = useState(endDefault);

    useEffect(() => {
        setStartDraft((startYear ?? minYear).toString());
    }, [startYear, minYear]);
    useEffect(() => {
        setEndDraft((endYear ?? maxYear).toString());
    }, [endYear, maxYear]);

    const apply = () => {
        const parsedStart = parseYear(startDraft);
        const parsedEnd = parseYear(endDraft);
        onApply({
            startYear:
                parsedStart != null && parsedStart >= minYear && parsedStart <= maxYear
                    ? parsedStart
                    : undefined,
            endYear:
                parsedEnd != null && parsedEnd >= minYear && parsedEnd <= maxYear
                    ? parsedEnd
                    : undefined,
        });
    };

    const clear = () => {
        setStartDraft(minYear.toString());
        setEndDraft(maxYear.toString());
        onApply({ startYear: undefined, endYear: undefined });
    };

    return (
        <div className="flex flex-wrap items-end gap-3">
            <YearField
                label="From"
                value={startDraft}
                onChange={setStartDraft}
                minYear={minYear}
                maxYear={maxYear}
            />
            <YearField
                label="To"
                value={endDraft}
                onChange={setEndDraft}
                minYear={minYear}
                maxYear={maxYear}
            />
            <Button type="button" onClick={apply} className="font-mono">
                Apply
            </Button>
            {(startYear || endYear) && (
                <Button type="button" variant="tertiary" onClick={clear}>
                    Clear
                </Button>
            )}
        </div>
    );
}

interface YearFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    minYear: number;
    maxYear: number;
}

function YearField({ label, value, onChange, minYear, maxYear }: YearFieldProps) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-caption uppercase tracking-wide text-smoke">
                {label}
            </span>
            <Input
                type="number"
                inputMode="numeric"
                min={minYear}
                max={maxYear}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={label === "From" ? `${minYear}` : `${maxYear}`}
                className="w-28 font-mono tabular-nums"
            />
        </label>
    );
}

function parseYear(value: string): number | undefined {
    if (!value) {
        return undefined;
    }
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : undefined;
}
