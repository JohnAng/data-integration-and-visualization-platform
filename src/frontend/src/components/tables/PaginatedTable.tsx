/**
 * PaginatedTable — generic data table with sticky header, server-side
 * sort (clickable column headers write sort_by / sort_order search
 * params), zebra striping, skeleton loading state and an empty-state
 * footer. Used by every list page across the app.
 */
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "./EmptyState";
import { TablePager } from "./TablePager";

export type SortDirection = "asc" | "desc";

export interface SortState {
    key: string;
    direction: SortDirection;
}

export interface PaginatedTableColumn<RowType> {
    /** Stable identifier for the column. Used as the React key and, when
     *  the column is sortable, also as the value passed back through the
     *  sort callback. */
    key: string;
    /** Header rendered above the column. */
    header: ReactNode;
    /** Horizontal alignment of the cell contents. Numeric columns
     *  automatically right-align and switch to monospace. */
    align?: "left" | "right" | "center";
    /** When true the cell uses tabular-nums monospace for column-aligned
     *  digits. */
    numeric?: boolean;
    /** Optional fixed width for the column (CSS value). */
    width?: string;
    /** When true the header becomes an interactive sort toggle. The
     *  emitted sort key defaults to `key`; override with sortKey when the
     *  backend expects a different identifier. */
    sortable?: boolean;
    /** Backend / sort-callback identifier when it differs from `key`. */
    sortKey?: string;
    /** Render the cell body for a row. */
    render: (row: RowType) => ReactNode;
}

interface PaginatedTableProps<RowType> {
    columns: PaginatedTableColumn<RowType>[];
    rows: RowType[];
    page: number;
    pageSize: number;
    totalItems: number;
    isLoading: boolean;
    onPageChange: (page: number) => void;
    rowKey: (row: RowType) => string | number;
    onRowClick?: (row: RowType) => void;
    emptyTitle?: string;
    emptyDescription?: string;
    /** Current sort, if any. When provided alongside onSortChange the
     *  sortable columns surface arrow icons and the active column gets
     *  a navy accent. */
    sort?: SortState;
    onSortChange?: (next: SortState | undefined) => void;
    /** Top offset (in px) for the sticky header. Defaults to 64 to
     *  match the navbar height. Pass 0 to disable stickiness. */
    stickyHeaderOffset?: number;
}

/**
 * Editorial paginated table with:
 *  - sticky header that lands beneath the navbar while scrolling,
 *  - optional per-column sort cycling (asc → desc → off),
 *  - parchment-tinted alternating row striping for legibility,
 *  - skeleton placeholders during fetches, empty state when idle.
 *
 * Pager footer always renders so the offset window stays visible during
 * fetches. Sort state is fully controlled — the caller owns sort.key and
 * sort.direction and decides whether to forward them to the backend.
 */
export function PaginatedTable<RowType>({
    columns,
    rows,
    page,
    pageSize,
    totalItems,
    isLoading,
    onPageChange,
    rowKey,
    onRowClick,
    emptyTitle = "No results",
    emptyDescription,
    sort,
    onSortChange,
    stickyHeaderOffset = 64,
}: PaginatedTableProps<RowType>) {
    const showEmptyState = !isLoading && rows.length === 0;

    const handleHeaderClick = (column: PaginatedTableColumn<RowType>): void => {
        if (!column.sortable || !onSortChange) return;
        const key = column.sortKey ?? column.key;
        if (sort?.key !== key) {
            onSortChange({ key, direction: "asc" });
            return;
        }
        if (sort.direction === "asc") {
            onSortChange({ key, direction: "desc" });
            return;
        }
        onSortChange(undefined);
    };

    return (
        <div className="border border-hairline bg-cream">
            <div className="max-w-full" style={{ overflowX: "clip" }}>
                <table className="w-full border-collapse">
                    <thead
                        className="bg-cream"
                        style={
                            stickyHeaderOffset > 0
                                ? {
                                      position: "sticky",
                                      top: stickyHeaderOffset,
                                      zIndex: 10,
                                  }
                                : undefined
                        }
                    >
                        <tr className="border-b border-hairline">
                            {columns.map((column) => {
                                const isSortable = Boolean(column.sortable && onSortChange);
                                const sortKey = column.sortKey ?? column.key;
                                const isActive = sort?.key === sortKey;
                                const alignClass =
                                    column.align === "right" || column.numeric
                                        ? "text-right"
                                        : column.align === "center"
                                          ? "text-center"
                                          : "text-left";
                                return (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        aria-sort={
                                            isActive
                                                ? sort.direction === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : isSortable
                                                  ? "none"
                                                  : undefined
                                        }
                                        className={cn(
                                            "px-4 py-3 text-caption uppercase tracking-wide font-medium bg-cream",
                                            alignClass,
                                            isActive ? "text-navy" : "text-smoke",
                                        )}
                                        style={
                                            column.width
                                                ? { width: column.width }
                                                : undefined
                                        }
                                    >
                                        {isSortable ? (
                                            <button
                                                type="button"
                                                onClick={() => handleHeaderClick(column)}
                                                className={cn(
                                                    "inline-flex items-center gap-1 select-none",
                                                    "hover:text-navy transition-colors duration-100",
                                                    column.align === "right" || column.numeric
                                                        ? "flex-row-reverse"
                                                        : "",
                                                )}
                                            >
                                                <span>{column.header}</span>
                                                <SortIcon
                                                    direction={
                                                        isActive ? sort.direction : undefined
                                                    }
                                                />
                                            </button>
                                        ) : (
                                            column.header
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 5 }).map((_, rowIndex) => (
                                  <tr
                                      key={`skeleton-${rowIndex}`}
                                      className="border-b border-hairline"
                                  >
                                      {columns.map((column) => (
                                          <td key={column.key} className="px-4 py-3">
                                              <Skeleton className="h-4 w-full" />
                                          </td>
                                      ))}
                                  </tr>
                              ))
                            : rows.map((row, rowIndex) => (
                                  <tr
                                      key={rowKey(row)}
                                      onClick={
                                          onRowClick ? () => onRowClick(row) : undefined
                                      }
                                      className={cn(
                                          "border-b border-hairline transition-colors duration-100",
                                          rowIndex % 2 === 1
                                              ? "bg-parchment/60"
                                              : "bg-cream",
                                          onRowClick && "hover:bg-linen cursor-pointer",
                                      )}
                                  >
                                      {columns.map((column) => (
                                          <td
                                              key={column.key}
                                              className={cn(
                                                  "px-4 py-3 text-body-sm text-ink align-top",
                                                  column.align === "right" ||
                                                      column.numeric
                                                      ? "text-right font-mono tabular-nums"
                                                      : column.align === "center"
                                                        ? "text-center"
                                                        : "text-left",
                                              )}
                                          >
                                              {column.render(row)}
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                    </tbody>
                </table>
            </div>
            {showEmptyState ? (
                <EmptyState title={emptyTitle} description={emptyDescription} />
            ) : null}
            <TablePager
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={onPageChange}
            />
        </div>
    );
}

function SortIcon({ direction }: { direction: SortDirection | undefined }) {
    if (direction === "asc") {
        return <ChevronUp className="size-3.5" strokeWidth={1.5} />;
    }
    if (direction === "desc") {
        return <ChevronDown className="size-3.5" strokeWidth={1.5} />;
    }
    return (
        <ChevronsUpDown
            className="size-3.5 opacity-40"
            strokeWidth={1.5}
        />
    );
}
