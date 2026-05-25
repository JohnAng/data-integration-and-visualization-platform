/**
 * SearchInput — debounced text input with a magnifying-glass icon. Used
 * by every list page (journals, conferences, authors). Calls onChange
 * 250 ms after the user stops typing to avoid hitting the API on every
 * keystroke.
 */
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "../../lib/cn";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
    autoFocus?: boolean;
}

/**
 * Free-text input with a leading magnifier icon and built-in debouncing.
 * The internal state lets the user type at full speed while the parent
 * onChange only fires after `debounceMs` of inactivity, so URL search
 * params do not churn on every keystroke.
 */
export function SearchInput({
    value,
    onChange,
    placeholder = "Search…",
    debounceMs = 250,
    className,
    autoFocus,
}: SearchInputProps) {
    const [localValue, setLocalValue] = useState(value);
    const debouncedValue = useDebounce(localValue, debounceMs);

    useEffect(() => {
        if (debouncedValue !== value) {
            onChange(debouncedValue);
        }
    }, [debouncedValue]);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className={cn("relative", className)}>
            <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-smoke"
                strokeWidth={1.5}
            />
            <input
                type="search"
                value={localValue}
                onChange={(event) => setLocalValue(event.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={cn(
                    "h-10 w-full pl-10 pr-3 bg-cream border border-hairline rounded-sm",
                    "font-sans text-body text-ink placeholder:text-smoke",
                    "transition-colors duration-100",
                    "hover:border-smoke focus-visible:border-ochre focus-visible:outline-none",
                )}
            />
        </div>
    );
}
