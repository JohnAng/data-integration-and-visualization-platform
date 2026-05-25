import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/journals/$journalId profile", () => {
    it("renders the journal title and quartile eyebrow", async () => {
        renderApp("/journals/1");
        expect(
            await screen.findByText("IEEE Trans. on Knowledge and Data Engineering"),
        ).toBeInTheDocument();
        expect(screen.getByText(/Journal · Q1/)).toBeInTheDocument();
    });

    it("renders the metadata fields supplied by the API", async () => {
        renderApp("/journals/1");
        expect(await screen.findByText("Publisher")).toBeInTheDocument();
        expect(screen.getByText("IEEE")).toBeInTheDocument();
        expect(screen.getByText("Country")).toBeInTheDocument();
        expect(screen.getByText("United States")).toBeInTheDocument();
    });

    it("renders the articles per year section", async () => {
        renderApp("/journals/1");
        expect(
            await screen.findByText("Articles per year"),
        ).toBeInTheDocument();
    });
});
