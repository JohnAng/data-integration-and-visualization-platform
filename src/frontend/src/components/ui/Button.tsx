/**
 * Button — shadcn-style button with several variants (primary, ghost,
 * destructive) and sizes. Built on @radix-ui/react-slot so it can be
 * composed with <Link> via the asChild prop.
 */
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const buttonStyles = cva(
    "inline-flex items-center justify-center gap-2 font-sans font-medium " +
        "transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 " +
        "focus-visible:outline-none",
    {
        variants: {
            variant: {
                primary: "bg-navy text-cream hover:bg-navy/90",
                secondary: "bg-cream text-navy border border-navy hover:bg-linen",
                tertiary: "bg-transparent text-navy hover:text-ochre",
                destructive: "bg-oxblood text-cream hover:bg-oxblood/90",
                ghost: "bg-transparent text-ink hover:bg-linen",
            },
            size: {
                sm: "h-8 px-3 text-body-sm rounded-sm",
                md: "h-10 px-4 text-body rounded-sm",
                lg: "h-12 px-5 text-body rounded-sm",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonStyles> {
    asChild?: boolean;
}

export function Button({
    className,
    variant,
    size,
    asChild = false,
    ...buttonProps
}: ButtonProps) {
    const Component = asChild ? Slot : "button";
    return (
        <Component
            className={cn(buttonStyles({ variant, size }), className)}
            {...buttonProps}
        />
    );
}
