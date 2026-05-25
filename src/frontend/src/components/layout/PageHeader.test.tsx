import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
    it("renders title as an h1", () => {
        render(<PageHeader title="Journals" />);
        const heading = screen.getByRole("heading", { name: "Journals", level: 1 });
        expect(heading.className).toContain("text-navy");
    });

    it("renders the optional eyebrow above the title", () => {
        render(<PageHeader eyebrow="Section" title="Journals" />);
        const eyebrow = screen.getByText("Section");
        expect(eyebrow.className).toContain("uppercase");
    });

    it("renders the italic lede when provided", () => {
        render(<PageHeader title="Journals" lede="Subtitle text" />);
        const lede = screen.getByText("Subtitle text");
        expect(lede.className).toContain("italic");
    });

    it("renders the actions slot", () => {
        render(
            <PageHeader
                title="Journals"
                actions={<button type="button">Action</button>}
            />,
        );
        expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    });
});
