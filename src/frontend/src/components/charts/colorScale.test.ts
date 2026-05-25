import { describe, expect, it } from "vitest";

import { CHART_COLORS, chartColor } from "./colorScale";

describe("chartColor", () => {
    it("returns the navy primary at index zero", () => {
        expect(chartColor(0)).toBe("#14213D");
    });

    it("returns each palette entry in order", () => {
        CHART_COLORS.forEach((expected, index) => {
            expect(chartColor(index)).toBe(expected);
        });
    });

    it("wraps around when the index exceeds the palette length", () => {
        expect(chartColor(CHART_COLORS.length)).toBe(CHART_COLORS[0]);
        expect(chartColor(CHART_COLORS.length + 2)).toBe(CHART_COLORS[2]);
    });
});
