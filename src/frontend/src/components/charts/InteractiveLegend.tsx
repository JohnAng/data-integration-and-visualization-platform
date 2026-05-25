/**
 * InteractiveLegend — clickable legend that toggles series visibility on
 * the parent chart. Shift-click isolates a single series; clicking
 * "Show all" restores every series. Used by LineChart and BarChart on
 * the /charts playground.
 */
import { cn } from "../../lib/cn";
import { chartColor } from "./colorScale";

export interface InteractiveLegendItem {
    key: string;
    label: string;
    colorIndex: number;
}

interface InteractiveLegendProps {
    items: InteractiveLegendItem[];
    hidden: Set<string>;
    onToggle: (key: string) => void;
    onShowAll?: () => void;
    onShowOnly?: (key: string) => void;
}

/**
 * Click-to-toggle chart legend.
 *
 * Each item shows a colour swatch and the series name. A simple click
 * toggles visibility; a double-click isolates that single series. The
 * hidden set is owned by the parent so the chart can reuse it to drop
 * series from the rendered data.
 */
export function InteractiveLegend({
    items,
    hidden,
    onToggle,
    onShowAll,
    onShowOnly,
}: InteractiveLegendProps) {
    if (items.length === 0) return null;
    const visibleCount = items.length - hidden.size;
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-sm">
            {items.map((item) => {
                const isHidden = hidden.has(item.key);
                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onToggle(item.key)}
                        onDoubleClick={() => onShowOnly?.(item.key)}
                        title="Click to toggle, double-click to isolate"
                        className={cn(
                            "inline-flex items-center gap-1.5 px-1 py-0.5 rounded-sm transition-opacity duration-100",
                            "hover:bg-parchment",
                            isHidden && "opacity-40 line-through",
                        )}
                    >
                        <span
                            className="inline-block size-2.5 rounded-xs"
                            style={{ backgroundColor: chartColor(item.colorIndex) }}
                        />
                        <span className="text-ink">{item.label}</span>
                    </button>
                );
            })}
            {hidden.size > 0 && onShowAll ? (
                <button
                    type="button"
                    onClick={onShowAll}
                    className="text-caption uppercase tracking-wide text-smoke hover:text-ochre transition-colors duration-100 px-1"
                >
                    Show all ({visibleCount} visible)
                </button>
            ) : null}
        </div>
    );
}
