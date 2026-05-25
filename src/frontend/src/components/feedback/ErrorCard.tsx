/**
 * ErrorCard — surface rendered whenever a TanStack Query throws. Reads
 * the RFC 7807 fields (title, status, detail) off of an ApiError and
 * exposes a retry button that re-runs the failing query.
 */
import { AlertCircle } from "lucide-react";

import { ApiError } from "../../api/client";
import { Button } from "../ui/Button";

interface ErrorCardProps {
    error: unknown;
    onRetry?: () => void;
}

/**
 * Renders a failed fetch as an inline editorial alert: oxblood border,
 * parchment background, an AlertCircle icon, the RFC 7807 title /
 * detail when available, and an optional Retry button. Non-ApiError
 * exceptions fall back to a generic message so the surface never
 * crashes silently.
 */
export function ErrorCard({ error, onRetry }: ErrorCardProps) {
    const { title, detail } = describeError(error);
    return (
        <div
            role="alert"
            className="border border-oxblood bg-parchment rounded-sm p-6 flex gap-4"
        >
            <AlertCircle className="size-5 text-oxblood shrink-0 mt-1" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
                <p className="font-serif text-h4 text-oxblood">{title}</p>
                <p className="text-body-sm text-slate mt-1">{detail}</p>
                {onRetry ? (
                    <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        className="mt-3 px-0"
                        onClick={onRetry}
                    >
                        Retry
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

function describeError(error: unknown): { title: string; detail: string } {
    if (error instanceof ApiError) {
        return {
            title: error.problem.title || `Request failed (${error.status})`,
            detail: error.problem.detail || "The server returned an error response.",
        };
    }
    if (error instanceof Error) {
        return {
            title: "Network error",
            detail: error.message,
        };
    }
    return {
        title: "Unknown error",
        detail: "Something went wrong while contacting the server.",
    };
}
