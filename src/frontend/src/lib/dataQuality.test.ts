import { describe, expect, it } from "vitest";

import { deriveConferenceAcronym, trimPartialLastYear } from "./dataQuality";

describe("deriveConferenceAcronym", () => {
    it("returns the explicit acronym when present", () => {
        expect(deriveConferenceAcronym("EDBT", "Extending Database Technology")).toBe(
            "EDBT",
        );
    });

    it("trims whitespace on the explicit acronym", () => {
        expect(deriveConferenceAcronym(" EDBT ", "title")).toBe(" EDBT ");
    });

    it("falls back to a short uppercase title", () => {
        expect(deriveConferenceAcronym(null, "BIOKDD")).toBe("BIOKDD");
        expect(deriveConferenceAcronym(null, "WSS")).toBe("WSS");
    });

    it("returns null when the title is too long", () => {
        expect(
            deriveConferenceAcronym(null, "Toward Category-Level Object Recognition"),
        ).toBeNull();
    });

    it("returns null when the title has whitespace", () => {
        expect(deriveConferenceAcronym(null, "XQuery Paradigms")).toBeNull();
    });

    it("returns null when the title is not predominantly uppercase", () => {
        expect(deriveConferenceAcronym(null, "lowercase")).toBeNull();
    });

    it("returns null on empty input", () => {
        expect(deriveConferenceAcronym(null, "")).toBeNull();
        expect(deriveConferenceAcronym("", "")).toBeNull();
    });
});

describe("trimPartialLastYear", () => {
    type Row = { year: number; count: number };
    const pick = (row: Row) => row.count;

    it("returns input unchanged when there are fewer than two rows", () => {
        const rows: Row[] = [{ year: 2013, count: 100 }];
        const { trimmed, partialYear } = trimPartialLastYear(rows, pick);
        expect(trimmed).toEqual(rows);
        expect(partialYear).toBeNull();
    });

    it("does not trim when the last year is healthy", () => {
        const rows: Row[] = [
            { year: 2012, count: 200 },
            { year: 2013, count: 210 },
        ];
        const { trimmed, partialYear } = trimPartialLastYear(rows, pick);
        expect(trimmed).toHaveLength(2);
        expect(partialYear).toBeNull();
    });

    it("trims the last year when below the 50 % threshold", () => {
        const rows: Row[] = [
            { year: 2012, count: 200 },
            { year: 2013, count: 200 },
            { year: 2014, count: 30 },
        ];
        const { trimmed, partialYear } = trimPartialLastYear(rows, pick);
        expect(trimmed.map((row) => row.year)).toEqual([2012, 2013]);
        expect(partialYear).toBe(2014);
    });

    it("respects a custom threshold", () => {
        const rows: Row[] = [
            { year: 2012, count: 100 },
            { year: 2013, count: 100 },
            { year: 2014, count: 80 },
        ];
        const { partialYear } = trimPartialLastYear(rows, pick, 0.9);
        expect(partialYear).toBe(2014);
    });

    it("sorts rows by year before deciding", () => {
        const rows: Row[] = [
            { year: 2014, count: 30 },
            { year: 2012, count: 200 },
            { year: 2013, count: 210 },
        ];
        const { trimmed, partialYear } = trimPartialLastYear(rows, pick);
        expect(trimmed.map((row) => row.year)).toEqual([2012, 2013]);
        expect(partialYear).toBe(2014);
    });
});
