/**
 * Skeleton — pulsing placeholder used by every async surface while
 * data is in flight. Keeps layout stable so the page does not jump
 * when the real content lands.
 */
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

/**
 * Subtle placeholder that pulses in linen against the parchment / cream
 * background. Used by tables and KPI tiles while their queries load.
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse bg-linen rounded-xs",
                className,
            )}
            {...rest}
        />
    );
}
