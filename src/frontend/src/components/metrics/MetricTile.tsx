/**
 * MetricTile — single KPI display. Renders a small uppercase eyebrow
 * label, a large monospace number, and an optional caption underneath.
 * Used on the landing page and the dashboard.
 */
import type { ReactNode } from "react";

import { Skeleton } from "../ui/Skeleton";

interface MetricTileProps {
    label: string;
    value: ReactNode;
    sublabel?: string;
    isLoading?: boolean;
}

/**
 * Editorial KPI tile: a large monospace numeral above an uppercase
 * caption label, with an optional muted sublabel beneath. When
 * isLoading is true, the numeral is replaced with a parchment-toned
 * skeleton placeholder.
 */
export function MetricTile({ label, value, sublabel, isLoading }: MetricTileProps) {
    return (
        <div className="text-center">
            {isLoading ? (
                <Skeleton className="h-10 w-24 mx-auto" />
            ) : (
                <p className="font-mono text-metric text-navy tabular-nums">{value}</p>
            )}
            <p className="mt-3 text-caption uppercase tracking-wide text-smoke">
                {label}
            </p>
            {sublabel ? (
                <p className="mt-1 text-body-sm text-slate">{sublabel}</p>
            ) : null}
        </div>
    );
}

export function MetricsGrid({
    children,
    columns = 3,
}: {
    children: ReactNode;
    columns?: 2 | 3 | 4;
}) {
    const columnClass = {
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-2 sm:grid-cols-4",
    }[columns];
    return <div className={`grid ${columnClass} gap-10`}>{children}</div>;
}
