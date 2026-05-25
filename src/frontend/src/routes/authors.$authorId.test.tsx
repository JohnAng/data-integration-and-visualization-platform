import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/authors/$authorId profile", () => {
    it("renders the author name as the page heading", async () => {
        renderApp("/authors/11");
        expect(await screen.findByText("Alice Smith")).toBeInTheDocument();
    });

    it("renders the metadata snapshot", async () => {
        renderApp("/authors/11");
        expect(await screen.findByText("Total articles")).toBeInTheDocument();
        expect(screen.getByText("First year")).toBeInTheDocument();
        expect(screen.getByText("Last year")).toBeInTheDocument();
    });

    it("renders the articles per year chart frame", async () => {
        renderApp("/authors/11");
        expect(
            await screen.findByText("Articles per year"),
        ).toBeInTheDocument();
    });
});
