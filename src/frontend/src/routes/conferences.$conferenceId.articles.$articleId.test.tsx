import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/conferences/$conferenceId/articles/$articleId", () => {
    it("renders the paper title and conference venue", async () => {
        renderApp("/conferences/1/articles/201");
        expect(await screen.findByText("ICDE Paper A")).toBeInTheDocument();
        expect(
            screen.getByText("International Conference on Data Engineering"),
        ).toBeInTheDocument();
    });

    it("labels the page as a conference paper in the eyebrow", async () => {
        renderApp("/conferences/1/articles/201");
        expect(
            await screen.findByText(/Conference paper/i),
        ).toBeInTheDocument();
    });
});
