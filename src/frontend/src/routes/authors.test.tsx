import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/authors list", () => {
    it("renders the authors search page", async () => {
        renderApp("/authors");
        expect(await screen.findByText("Search authors")).toBeInTheDocument();
    });

    it("renders the author cards from the API", async () => {
        renderApp("/authors");
        expect(await screen.findByText("Alice Smith")).toBeInTheDocument();
        expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });

    it("links each author card to the author profile", async () => {
        renderApp("/authors");
        const alice = await screen.findByRole("link", { name: /Alice Smith/i });
        expect(alice.getAttribute("href")).toMatch(/\/authors\/11/);
    });
});
