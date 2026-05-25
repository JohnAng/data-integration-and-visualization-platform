/**
 * Format a number with thousand separators and an optional fixed number
 * of fraction digits. Pinned to en-US so the editorial typography looks
 * the same on every machine, regardless of the visitor's locale.
 */
export function formatThousands(value: number, fractionDigits = 0): string {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
}

/**
 * Compact a large number into journal-tile form: 1 234 → "1.2K",
 * 1 234 567 → "1.2M", 1 234 567 890 → "1.2B". Useful for KPI tiles
 * where space is tight and exact precision is not required. Pinned to
 * en-US for the same reason as formatThousands above.
 */
export function formatCompact(value: number): string {
    return value.toLocaleString("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    });
}

/**
 * Render a number that may be null. Returns a single em dash when the
 * value is not known so KPI tiles never read "null" or "NaN".
 */
export function formatNullable(
    value: number | null | undefined,
    formatter: (value: number) => string = formatThousands,
): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "—";
    }
    return formatter(value);
}
