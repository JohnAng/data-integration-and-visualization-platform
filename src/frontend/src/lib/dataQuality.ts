/**
 * Helpers for presenting incomplete / partial data honestly.
 *
 * iCore26 covers ~944 conference acronyms while DBLP exposes ~5500 distinct
 * booktitles, and Kaggle's journal ranking covers ~80 % of the DBLP
 * journals. The remainder lands in the corpus without ranking metadata.
 * Rather than render those as empty dashes, the UI surfaces an explicit
 * "Unranked" badge and falls back to DBLP-derived acronyms where the
 * conference title already looks like one.
 */

/**
 * Returns a printable acronym for a conference. Prefers the iCore acronym,
 * then falls back to the title when it looks like an acronym itself
 * (short, no whitespace, mostly uppercase / digits). Otherwise returns
 * null so the caller can render the "Unranked" indicator.
 */
export function deriveConferenceAcronym(
    acronym: string | null,
    title: string,
): string | null {
    if (acronym && acronym.trim().length > 0) {
        return acronym;
    }
    const cleaned = title.trim();
    if (cleaned.length === 0 || cleaned.length > 12) {
        return null;
    }
    if (cleaned.includes(" ") || cleaned.includes("-")) {
        return null;
    }
    const uppercaseRatio =
        cleaned.replace(/[^A-Z0-9*'.]/g, "").length / cleaned.length;
    if (uppercaseRatio < 0.6) {
        return null;
    }
    return cleaned;
}

/**
 * Detect whether the last data point in a yearly timeseries is a partial
 * year. DBLP exports occasionally end mid-year, producing a final bucket
 * that contains a fraction of what a complete year would. When the last
 * year holds less than `threshold` (default 50 %) of the penultimate
 * year's count, the helper flags it as partial and returns the trimmed
 * series with that x-value removed.
 */
export function trimPartialLastYear<T extends { year: number }>(
    rows: T[],
    pickCount: (row: T) => number,
    threshold: number = 0.5,
): { trimmed: T[]; partialYear: number | null } {
    if (rows.length < 2) {
        return { trimmed: rows, partialYear: null };
    }
    const sorted = [...rows].sort((a, b) => a.year - b.year);
    const last = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    const lastCount = pickCount(last);
    const previousCount = pickCount(previous);
    if (previousCount > 0 && lastCount < previousCount * threshold) {
        return { trimmed: sorted.slice(0, -1), partialYear: last.year };
    }
    return { trimmed: sorted, partialYear: null };
}
