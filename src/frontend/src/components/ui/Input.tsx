/**
 * Input — styled wrapper around the native <input> with consistent
 * padding, focus ring and disabled state. Used by every form control
 * across the app.
 */
import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...inputProps }: InputProps) {
    return (
        <input
            className={cn(
                "h-10 w-full px-3 py-2 bg-cream border border-hairline rounded-sm",
                "font-sans text-body text-ink placeholder:text-smoke",
                "transition-colors duration-100",
                "hover:border-smoke",
                "focus-visible:border-ochre focus-visible:outline-none",
                "disabled:bg-linen disabled:text-smoke disabled:cursor-not-allowed",
                className,
            )}
            {...inputProps}
        />
    );
}
