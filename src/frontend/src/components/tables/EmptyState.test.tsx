import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
    it("renders title in serif h4 style", () => {
        render(<EmptyState title="No results" />);
        const title = screen.getByText("No results");
        expect(title.className).toContain("font-serif");
        expect(title.className).toContain("text-navy");
    });

    it("renders optional description in muted slate", () => {
        render(<EmptyState title="No results" description="Try widening filters" />);
        const description = screen.getByText("Try widening filters");
        expect(description.className).toContain("text-slate");
    });

    it("renders optional action slot", () => {
        render(
            <EmptyState
                title="No results"
                action={<button type="button">Reset</button>}
            />,
        );
        expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    });
});
