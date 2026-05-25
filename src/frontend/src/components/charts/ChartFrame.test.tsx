import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartFrame } from "./ChartFrame";

describe("ChartFrame", () => {
    it("renders the optional title and caption", () => {
        render(
            <ChartFrame title="Yearly totals" caption="Trimmed last year">
                {() => <span data-testid="canvas">canvas</span>}
            </ChartFrame>,
        );
        expect(screen.getByText("Yearly totals")).toBeInTheDocument();
        expect(screen.getByText("Trimmed last year")).toBeInTheDocument();
    });

    it("renders a skeleton placeholder when isLoading is true", () => {
        const { container } = render(
            <ChartFrame isLoading>
                {() => <span>canvas</span>}
            </ChartFrame>,
        );
        const skeleton = container.querySelector(".animate-pulse");
        expect(skeleton).not.toBeNull();
    });

    it("renders the empty message when isEmpty is true", () => {
        render(
            <ChartFrame isEmpty emptyMessage="Nothing to see">
                {() => <span>canvas</span>}
            </ChartFrame>,
        );
        expect(screen.getByText("Nothing to see")).toBeInTheDocument();
    });

    it("renders the legend swatches when supplied", () => {
        render(
            <ChartFrame
                legend={[
                    { label: "Series A" },
                    { label: "Series B", colorIndex: 2 },
                ]}
            >
                {() => <span>canvas</span>}
            </ChartFrame>,
        );
        expect(screen.getByText("Series A")).toBeInTheDocument();
        expect(screen.getByText("Series B")).toBeInTheDocument();
    });
});
