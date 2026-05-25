/**
 * SelectFilter — styled single-select dropdown used by every list page
 * for categorical filters (quartile, rank, subject area, primary FoR).
 * Wraps a native <select> so accessibility and keyboard support are
 * preserved.
 */
import { ChevronDown } from "lucide-react";

import { cn } from "../../lib/cn";

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectFilterProps {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    ariaLabel?: string;
}

/**
 * Native HTML select wrapped with the project's hairline border, ochre
 * focus ring, and a trailing chevron icon. Empty value renders as
 * "All" so the filter is always clearable without an extra button.
 */
export function SelectFilter({
    value,
    onChange,
    options,
    placeholder = "All",
    className,
    ariaLabel,
}: SelectFilterProps) {
    return (
        <div className={cn("relative", className)}>
            <select
                value={value ?? ""}
                onChange={(event) => {
                    const next = event.target.value;
                    onChange(next === "" ? undefined : next);
                }}
                aria-label={ariaLabel}
                className={cn(
                    "h-10 w-full pl-3 pr-10 bg-cream border border-hairline rounded-sm",
                    "font-sans text-body text-ink",
                    "appearance-none cursor-pointer",
                    "transition-colors duration-100",
                    "hover:border-smoke focus-visible:border-ochre focus-visible:outline-none",
                )}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-smoke pointer-events-none"
                strokeWidth={1.5}
            />
        </div>
    );
}
