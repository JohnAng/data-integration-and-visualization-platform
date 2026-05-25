/**
 * Deterministic chart palette. The series order matches docs/design.md
 * section 3.4: navy primary, then ochre, oxblood, sage, sky, wheat.
 * Charts with more than six series should be re-thought (split, filter)
 * rather than wrapped around.
 */
export const CHART_COLORS = [
    "#14213D",
    "#A88B4A",
    "#6B2737",
    "#4F6F4E",
    "#5B7B8C",
    "#C9A961",
] as const;

export function chartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
}

export const CHART_AXIS_COLOR = "#C8C0AE";
export const CHART_LABEL_COLOR = "#8A857A";
export const CHART_GRID_COLOR = "rgba(200, 192, 174, 0.4)";
