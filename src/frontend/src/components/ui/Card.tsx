/**
 * Card — surface primitive: hairline border, parchment background,
 * subtle rounding. Composed of Card + CardHeader + CardContent +
 * CardFooter parts so callers can rebuild any vertical-stack layout.
 */
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "bg-parchment border border-hairline rounded-sm p-6",
                className,
            )}
            {...rest}
        />
    );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("mb-4 space-y-1", className)} {...rest} />;
}

export function CardEyebrow({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn(
                "text-caption uppercase text-smoke tracking-wide",
                className,
            )}
            {...rest}
        />
    );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h2
            className={cn("font-serif text-h4 text-navy", className)}
            {...rest}
        />
    );
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("text-body text-ink", className)} {...rest} />;
}
