import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/journals/$journalId/articles/$articleId", () => {
    it("renders the paper title and venue lede", async () => {
        renderApp("/journals/1/articles/101");
        expect(await screen.findByText("Paper A")).toBeInTheDocument();
        expect(
            screen.getByText("IEEE Trans. on Knowledge and Data Engineering"),
        ).toBeInTheDocument();
    });

    it("renders each author as a pill link", async () => {
        renderApp("/journals/1/articles/101");
        const aliceLink = await screen.findByRole("link", { name: "Alice Smith" });
        expect(aliceLink).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Bob Jones" }),
        ).toBeInTheDocument();
    });
});
