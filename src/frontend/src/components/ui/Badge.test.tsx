import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./Badge";

describe("Badge", () => {
    it("renders children inside a span", () => {
        render(<Badge>Hello</Badge>);
        const badge = screen.getByText("Hello");
        expect(badge.tagName).toBe("SPAN");
    });

    it("applies navy tone by default", () => {
        render(<Badge>navy</Badge>);
        const badge = screen.getByText("navy");
        expect(badge.className).toContain("border-navy");
        expect(badge.className).toContain("text-navy");
    });

    it("applies the requested tone when specified", () => {
        render(<Badge tone="oxblood">danger</Badge>);
        const badge = screen.getByText("danger");
        expect(badge.className).toContain("border-oxblood");
        expect(badge.className).toContain("text-oxblood");
    });

    it("renders uppercase caption text", () => {
        render(<Badge>scope</Badge>);
        expect(screen.getByText("scope").className).toContain("uppercase");
    });
});
