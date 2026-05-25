/**
 * Badge — compact label chip with several semantic variants (neutral,
 * ranked, accent). Used for quartile labels, rank values and inline
 * status indicators.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const badgeStyles = cva(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-xs border " +
        "text-caption uppercase tracking-wide font-medium",
    {
        variants: {
            tone: {
                navy: "border-navy text-navy bg-navy/10",
                ochre: "border-ochre text-ochre bg-ochre/10",
                oxblood: "border-oxblood text-oxblood bg-oxblood/10",
                sage: "border-sage text-sage bg-sage/10",
                sky: "border-sky text-sky bg-sky/10",
                wheat: "border-wheat text-wheat bg-wheat/10",
                smoke: "border-smoke text-smoke bg-smoke/10",
            },
        },
        defaultVariants: {
            tone: "navy",
        },
    },
);

export interface BadgeProps
    extends HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeStyles> {}

export function Badge({ className, tone, ...rest }: BadgeProps) {
    return <span className={cn(badgeStyles({ tone }), className)} {...rest} />;
}
