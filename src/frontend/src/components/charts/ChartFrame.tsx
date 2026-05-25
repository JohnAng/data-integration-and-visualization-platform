import { ParentSize } from "@visx/responsive";
import type { ReactNode } from "react";

import { Skeleton } from "../ui/Skeleton";
import { chartColor } from "./colorScale";

interface ChartFrameProps {
    title?: string;
    caption?: ReactNode;
    height?: number;
    isLoading?: boolean;
    isEmpty?: boolean;
    emptyMessage?: string;
    legend?: { label: string; colorIndex?: number }[];
    /**
     * Optional content rendered between the chart canvas and the
     * figcaption. Used for interactive legends, zoom controls and other
     * widgets that depend on per-chart state.
     */
    footer?: ReactNode;
    children: (size: { width: number; height: number }) => ReactNode;
}

/**
 * Standard figure wrapping around every Visx chart in the application.
 * Provides:
 *   - a parchment-bordered frame with consistent padding
 *   - an automatic ResizeObserver-driven width via @visx/responsive
 *   - skeleton loading state and italic empty state
 *   - an optional legend row with colour swatches
 *   - a figcaption beneath the canvas in slate body-sm
 */
export function ChartFrame({
    title,
    caption,
    height = 320,
    isLoading,
    isEmpty,
    emptyMessage = "No data points in the selected range.",
    legend,
    footer,
    children,
}: ChartFrameProps) {
    return (
        <figure className="border border-hairline rounded-sm bg-parchment p-6">
            {(title || legend) && (
                <div className="flex items-start justify-between gap-4 mb-4">
                    {title ? (
                        <p className="text-caption uppercase tracking-wide text-smoke">
                            {title}
                        </p>
                    ) : (
                        <span />
                    )}
                    {legend && legend.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-4">
                            {legend.map((entry, index) => (
                                <span
                                    key={entry.label}
                                    className="inline-flex items-center gap-2 text-caption uppercase tracking-wide text-smoke"
                                >
                                    <span
                                        className="inline-block size-2 rounded-xs"
                                        style={{
                                            backgroundColor: chartColor(
                                                entry.colorIndex ?? index,
                                            ),
                                        }}
                                    />
                                    {entry.label}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}

            <div style={{ height }} className="relative">
                {isLoading ? (
                    <Skeleton className="absolute inset-0" />
                ) : isEmpty ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-body-sm italic text-slate">
                            {emptyMessage}
                        </p>
                    </div>
                ) : (
                    <ParentSize>
                        {({ width, height: innerHeight }) =>
                            children({ width, height: innerHeight })
                        }
                    </ParentSize>
                )}
            </div>

            {footer ? <div className="mt-4">{footer}</div> : null}

            {caption ? (
                <figcaption className="mt-3 text-body-sm text-slate">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}
