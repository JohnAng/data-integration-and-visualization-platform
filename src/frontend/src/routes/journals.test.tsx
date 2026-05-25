import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/journals list", () => {
    it("renders the journals header and table", async () => {
        renderApp("/journals");
        expect(await screen.findByText("Browse journals")).toBeInTheDocument();
        expect(
            await screen.findByText("IEEE Trans. on Knowledge and Data Engineering"),
        ).toBeInTheDocument();
    });

    it("renders an Unranked badge for journals without a quartile", async () => {
        renderApp("/journals");
        await screen.findByText("Some Unranked Journal");
        const unrankedBadges = await screen.findAllByText("Unranked");
        expect(unrankedBadges.length).toBeGreaterThan(0);
    });

    it("renders a quartile badge for ranked journals", async () => {
        renderApp("/journals");
        const q1Badges = await screen.findAllByText("Q1");
        expect(q1Badges.length).toBeGreaterThan(0);
    });

    it("filters out unranked journals when the checkbox is toggled", async () => {
        renderApp("/journals");
        await screen.findByText("Some Unranked Journal");
        const checkbox = screen.getByRole("checkbox", {
            name: /only ranked/i,
        });
        await userEvent.click(checkbox);
        await waitFor(() =>
            expect(
                screen.queryByText("Some Unranked Journal"),
            ).not.toBeInTheDocument(),
        );
    });
});
