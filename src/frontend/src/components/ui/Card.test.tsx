import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardContent, CardEyebrow, CardHeader, CardTitle } from "./Card";

describe("Card primitives", () => {
    it("renders children inside a parchment-bordered container", () => {
        render(<Card>contents</Card>);
        const card = screen.getByText("contents");
        expect(card.className).toContain("bg-parchment");
        expect(card.className).toContain("border");
    });

    it("CardTitle renders an h2 with serif typography and navy text", () => {
        render(<CardTitle>Title</CardTitle>);
        const heading = screen.getByRole("heading", { name: "Title", level: 2 });
        expect(heading.className).toContain("font-serif");
        expect(heading.className).toContain("text-navy");
    });

    it("CardEyebrow renders uppercase caption text in smoke", () => {
        render(<CardEyebrow>Section</CardEyebrow>);
        const eyebrow = screen.getByText("Section");
        expect(eyebrow.className).toContain("uppercase");
        expect(eyebrow.className).toContain("text-smoke");
    });

    it("CardHeader composes title and eyebrow children together", () => {
        render(
            <CardHeader data-testid="header">
                <CardEyebrow>eyebrow</CardEyebrow>
                <CardTitle>title</CardTitle>
            </CardHeader>,
        );
        const header = screen.getByTestId("header");
        expect(header.textContent).toContain("eyebrow");
        expect(header.textContent).toContain("title");
    });

    it("CardContent forwards children", () => {
        render(<CardContent>body</CardContent>);
        expect(screen.getByText("body")).toBeInTheDocument();
    });
});
