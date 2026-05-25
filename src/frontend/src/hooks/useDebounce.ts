import { useEffect, useState } from "react";

/**
 * Returns a value that updates only after the input has remained stable
 * for `delayMs` milliseconds. Used by SearchInput to avoid hitting the
 * API on every keystroke while still keeping the UI responsive locally.
 */
export function useDebounce<ValueType>(value: ValueType, delayMs: number): ValueType {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const handle = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(handle);
    }, [value, delayMs]);

    return debounced;
}
