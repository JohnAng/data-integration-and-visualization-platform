import { describe, expect, it } from "vitest";

import { formatCompact, formatNullable, formatThousands } from "./formatNumber";

describe("formatThousands", () => {
    it("inserts locale thousand separators for large integers", () => {
        const formatted = formatThousands(2_525_752);
        expect(formatted).toMatch(/^2[,.\s  ]525[,.\s  ]752$/);
    });

    it("returns zero unchanged", () => {
        expect(formatThousands(0)).toBe("0");
    });

    it("respects fractionDigits", () => {
        const formatted = formatThousands(1.5, 2);
        expect(formatted).toMatch(/^1[,.]50$/);
    });
});

describe("formatCompact", () => {
    it("uses K suffix for thousands", () => {
        expect(formatCompact(1_500)).toMatch(/1\.5/);
    });

    it("uses M suffix for millions", () => {
        expect(formatCompact(2_525_752)).toMatch(/2\.5/);
    });
});

describe("formatNullable", () => {
    it("returns em dash for null", () => {
        expect(formatNullable(null)).toBe("—");
    });

    it("returns em dash for undefined", () => {
        expect(formatNullable(undefined)).toBe("—");
    });

    it("returns em dash for NaN", () => {
        expect(formatNullable(Number.NaN)).toBe("—");
    });

    it("formats real numbers through the default formatter", () => {
        const formatted = formatNullable(1234);
        expect(formatted).toMatch(/^1[,.\s  ]234$/);
    });

    it("uses the supplied formatter when one is given", () => {
        expect(formatNullable(2.5, (value) => value.toFixed(2))).toBe("2.50");
    });
});
