/**
 * EmptyState — centred empty-tray illustration with title and lede,
 * rendered inside PaginatedTable when a query returns zero rows or
 * when filters exclude everything.
 */
import type { ReactNode } from "react";

import { Inbox } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
}

/**
 * Editorial empty state shown when a list, search, or table has no
 * results. Centred icon over a one-line headline and a muted secondary
 * description. Used by every PaginatedTable when items is empty.
 */
export function EmptyState({
    title,
    description,
    icon,
    action,
}: EmptyStateProps) {
    return (
        <div className="text-center py-16">
            <div className="flex justify-center text-smoke">
                {icon ?? <Inbox className="size-6" strokeWidth={1.5} />}
            </div>
            <p className="font-serif text-h4 text-navy mt-4">{title}</p>
            {description ? (
                <p className="text-body-sm text-slate mt-1 max-w-md mx-auto">
                    {description}
                </p>
            ) : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}
