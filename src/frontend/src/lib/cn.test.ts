import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
    it("joins multiple class names", () => {
        expect(cn("a", "b", "c")).toBe("a b c");
    });

    it("drops falsy values", () => {
        expect(cn("a", false, null, undefined, "b")).toBe("a b");
    });

    it("resolves conflicting Tailwind utilities via tailwind-merge", () => {
        expect(cn("p-2", "p-4")).toBe("p-4");
    });

    it("preserves non-conflicting utilities", () => {
        expect(cn("text-navy", "bg-cream")).toBe("text-navy bg-cream");
    });
});
