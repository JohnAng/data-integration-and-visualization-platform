import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/conferences/$conferenceId profile", () => {
    it("renders the conference title and rank eyebrow", async () => {
        renderApp("/conferences/1");
        expect(
            await screen.findByText("International Conference on Data Engineering"),
        ).toBeInTheDocument();
        expect(screen.getByText(/Conference · A\*/)).toBeInTheDocument();
    });

    it("renders the metadata grid with the acronym and rank", async () => {
        renderApp("/conferences/1");
        expect(await screen.findByText("Acronym")).toBeInTheDocument();
        expect(screen.getAllByText("ICDE").length).toBeGreaterThan(0);
        expect(screen.getByText("Rank")).toBeInTheDocument();
    });
});
