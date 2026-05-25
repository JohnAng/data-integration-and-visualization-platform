import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/conferences list", () => {
    it("renders the conferences header and a sample row", async () => {
        renderApp("/conferences");
        expect(await screen.findByText("Browse conferences")).toBeInTheDocument();
        expect(
            await screen.findByText("International Conference on Data Engineering"),
        ).toBeInTheDocument();
    });

    it("renders the Unranked badge for conferences not in iCore26", async () => {
        renderApp("/conferences");
        await screen.findByText("Some Unranked Conference");
        const unrankedBadges = await screen.findAllByText("Unranked");
        expect(unrankedBadges.length).toBeGreaterThan(0);
    });

    it("hides unranked conferences when the toggle is on", async () => {
        renderApp("/conferences");
        await screen.findByText("Some Unranked Conference");
        const checkbox = screen.getByRole("checkbox", {
            name: /only icore-ranked/i,
        });
        await userEvent.click(checkbox);
        expect(
            await screen.findByText("International Conference on Data Engineering"),
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Some Unranked Conference"),
        ).not.toBeInTheDocument();
    });
});
