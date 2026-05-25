import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/years/$year detail", () => {
    it("renders the year as the page title", async () => {
        renderApp("/years/2013");
        const heading = await screen.findByRole("heading", {
            name: "2013",
            level: 1,
        });
        expect(heading).toBeInTheDocument();
    });

    it("renders four KPI tiles", async () => {
        renderApp("/years/2013");
        expect(await screen.findByText("Total")).toBeInTheDocument();
        expect(screen.getAllByText("Journals").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Conferences").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Authors").length).toBeGreaterThan(0);
    });

    it("switches tabs when the user clicks Journals", async () => {
        renderApp("/years/2013");
        await screen.findByText("Total");
        const journalsTab = screen.getByRole("tab", { name: "Journals" });
        await userEvent.click(journalsTab);
        await waitFor(() =>
            expect(journalsTab.getAttribute("data-state")).toBe("active"),
        );
    });
});
