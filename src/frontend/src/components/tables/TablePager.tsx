/**
 * TablePager — page number controls below every PaginatedTable.
 * Renders prev / next buttons and a numeric range like "1-50 of 1 423".
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "../../lib/cn";
import { formatThousands } from "../../lib/formatNumber";

interface TablePagerProps {
    page: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

/**
 * One-line pagination footer rendered below every PaginatedTable.
 * Shows the current 1-based offset window ("1-50 of 60,410") on the
 * left and prev / next chevrons with the page number on the right.
 */
export function TablePager({
    page,
    pageSize,
    totalItems,
    onPageChange,
}: TablePagerProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const firstItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const lastItem = Math.min(totalItems, safePage * pageSize);
    const canGoBack = safePage > 1;
    const canGoForward = safePage < totalPages;

    return (
        <div className="flex items-center justify-between px-4 py-3 text-body-sm text-slate border-t border-hairline">
            <span className="font-mono tabular-nums">
                {formatThousands(firstItem)}–{formatThousands(lastItem)} of{" "}
                {formatThousands(totalItems)}
            </span>
            <div className="flex items-center gap-2">
                <PagerButton
                    label="Previous page"
                    disabled={!canGoBack}
                    onClick={() => onPageChange(safePage - 1)}
                >
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                </PagerButton>
                <span className="font-mono tabular-nums px-2">
                    {formatThousands(safePage)} / {formatThousands(totalPages)}
                </span>
                <PagerButton
                    label="Next page"
                    disabled={!canGoForward}
                    onClick={() => onPageChange(safePage + 1)}
                >
                    <ChevronRight className="size-4" strokeWidth={1.5} />
                </PagerButton>
            </div>
        </div>
    );
}

interface PagerButtonProps {
    label: string;
    disabled: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

function PagerButton({ label, disabled, onClick, children }: PagerButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-sm border border-hairline",
                "transition-colors duration-100",
                "hover:bg-linen hover:border-smoke",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
            )}
        >
            {children}
        </button>
    );
}
