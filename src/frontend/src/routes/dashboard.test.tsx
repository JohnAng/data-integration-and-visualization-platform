import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/dashboard", () => {
    it("renders the four KPI tiles", async () => {
        renderApp("/dashboard");
        expect(await screen.findByText("At a glance")).toBeInTheDocument();
        // The navbar and the KPI tiles share the labels Authors / Journals /
        // Conferences. getAllByText avoids coupling to navbar internals.
        expect(screen.getAllByText("Articles").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Authors").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Journals").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Conferences").length).toBeGreaterThan(0);
    });

    it("renders the publications-over-time section", async () => {
        renderApp("/dashboard");
        expect(
            await screen.findByText("Publications over time"),
        ).toBeInTheDocument();
    });

    it("renders the recent activity section", async () => {
        renderApp("/dashboard");
        await waitFor(() =>
            expect(screen.getByText("Recent activity")).toBeInTheDocument(),
        );
    });
});
