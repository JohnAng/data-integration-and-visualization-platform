import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";
import { server } from "../test/server";

describe("/ Landing", () => {
    it("renders the editorial hero copy", async () => {
        renderApp("/");
        expect(
            await screen.findByText("Bibliographic data, read like a journal."),
        ).toBeInTheDocument();
        expect(screen.getAllByText(/University of Ioannina/i).length).toBeGreaterThan(0);
    });

    it("renders the three KPI tiles populated from /api/meta/totals", async () => {
        renderApp("/");
        expect(await screen.findByText("Articles")).toBeInTheDocument();
        expect(await screen.findByText("Authors")).toBeInTheDocument();
        expect(await screen.findByText("Venues")).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getAllByText(/2\.5M/).length).toBeGreaterThan(0),
        );
    });

    it("renders the CTA link to the dashboard", async () => {
        renderApp("/");
        const cta = await screen.findByRole("link", { name: /Enter the dashboard/i });
        expect(cta.getAttribute("href")).toBe("/dashboard");
    });

    it("shows the error card on a failing totals fetch", async () => {
        server.use(
            http.get("*/api/meta/totals", () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "Internal Server Error",
                        status: 500,
                        detail: "Database is napping",
                    },
                    { status: 500 },
                ),
            ),
        );
        renderApp("/");
        await waitFor(() =>
            expect(screen.getByRole("alert")).toBeInTheDocument(),
        );
    });
});
