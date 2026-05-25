/**
 * MetadataGrid — two-column key / value grid used on every profile page
 * to display ranking metrics, year span, average authors per article,
 * and similar small facts.
 */
import type { ReactNode } from "react";

import { Card } from "../ui/Card";

export interface MetadataEntry {
    label: string;
    value: ReactNode;
}

interface MetadataGridProps {
    entries: MetadataEntry[];
    columns?: 2 | 3;
}

/**
 * Two- or three-column metadata block used by profile pages. Renders
 * each entry as an editorial label-and-value pair separated by a thin
 * middle dot, similar to a journal masthead's bibliographic record.
 */
export function MetadataGrid({ entries, columns = 2 }: MetadataGridProps) {
    const visible = entries.filter(
        (entry) =>
            entry.value != null &&
            entry.value !== "" &&
            entry.value !== "—",
    );
    if (visible.length === 0) {
        return null;
    }
    const columnClass = columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
    return (
        <Card>
            <dl className={`grid grid-cols-1 ${columnClass} gap-x-8 gap-y-4`}>
                {visible.map((entry) => (
                    <div key={entry.label} className="flex flex-col">
                        <dt className="text-caption uppercase tracking-wide text-smoke">
                            {entry.label}
                        </dt>
                        <dd className="font-sans text-body text-ink mt-1">
                            {entry.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}
