import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "../test/render";

describe("/charts playground", () => {
    it("renders the page header and the data-set sidebar", async () => {
        renderApp("/charts");
        expect(
            await screen.findByText("Visualization playground"),
        ).toBeInTheDocument();
        expect(screen.getByText("Data set")).toBeInTheDocument();
    });

    it("switches to the publisher quartile bar chart", async () => {
        renderApp("/charts");
        const select = await screen.findByLabelText(/chart type/i);
        await userEvent.selectOptions(select, "publisher_quartile");
        expect(
            await screen.findByText("Publisher quartile distribution"),
        ).toBeInTheDocument();
    });

    it("switches to the field-of-research line chart", async () => {
        renderApp("/charts");
        const select = await screen.findByLabelText(/chart type/i);
        await userEvent.selectOptions(select, "for_yearly");
        expect(
            await screen.findByText("Field of Research yearly summary"),
        ).toBeInTheDocument();
    });

    it("switches to the journal metrics scatter chart", async () => {
        renderApp("/charts");
        const select = await screen.findByLabelText(/chart type/i);
        await userEvent.selectOptions(select, "journal_metrics");
        expect(
            await screen.findByText("Journal metrics scatter"),
        ).toBeInTheDocument();
    });

    it("switches to the authors vs articles scatter", async () => {
        renderApp("/charts");
        const select = await screen.findByLabelText(/chart type/i);
        await userEvent.selectOptions(select, "authors_vs_articles");
        expect(
            await screen.findByText(
                "Authors per article vs articles per year",
            ),
        ).toBeInTheDocument();
    });

    it("prompts the user to pick venues for the comparison chart", async () => {
        renderApp("/charts");
        const select = await screen.findByLabelText(/chart type/i);
        await userEvent.selectOptions(select, "venue_comparison");
        expect(
            await screen.findByText(/pick one or more venues/i),
        ).toBeInTheDocument();
    });

    it("exposes a reset filters button", async () => {
        renderApp("/charts");
        await screen.findByLabelText(/chart type/i);
        expect(
            screen.getByRole("button", { name: /reset filters/i }),
        ).toBeInTheDocument();
    });
});
