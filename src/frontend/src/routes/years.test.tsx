import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/years list", () => {
    it("renders the years header and table", async () => {
        renderApp("/years");
        expect(
            await screen.findByText("Publications by year"),
        ).toBeInTheDocument();
        const cells = await screen.findAllByText(/2013|2014|2012/);
        expect(cells.length).toBeGreaterThan(0);
    });

    it("links each year to its detail page", async () => {
        renderApp("/years");
        const link = await screen.findByRole("link", { name: "2013" });
        expect(link.getAttribute("href")).toBe("/years/2013");
    });
});
