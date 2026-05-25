import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricsGrid, MetricTile } from "./MetricTile";

describe("MetricTile", () => {
    it("renders the value in JetBrains Mono with the navy palette", () => {
        render(<MetricTile label="Articles" value="2.5M" />);
        const value = screen.getByText("2.5M");
        expect(value.className).toContain("font-mono");
        expect(value.className).toContain("text-navy");
        expect(value.className).toContain("tabular-nums");
    });

    it("renders the label in uppercase caption styling", () => {
        render(<MetricTile label="Articles" value="2.5M" />);
        const label = screen.getByText("Articles");
        expect(label.className).toContain("uppercase");
        expect(label.className).toContain("text-smoke");
    });

    it("renders the optional sublabel when present", () => {
        render(
            <MetricTile
                label="Authors"
                value="1.4M"
                sublabel="1,395,532 unique"
            />,
        );
        expect(screen.getByText("1,395,532 unique")).toBeInTheDocument();
    });

    it("replaces the numeral with a skeleton while loading", () => {
        render(<MetricTile label="Articles" value="2.5M" isLoading />);
        expect(screen.queryByText("2.5M")).not.toBeInTheDocument();
    });
});

describe("MetricsGrid", () => {
    it("renders children in a CSS grid", () => {
        render(
            <MetricsGrid columns={2} data-testid="grid">
                <span>one</span>
                <span>two</span>
            </MetricsGrid>,
        );
        expect(screen.getByText("one")).toBeInTheDocument();
        expect(screen.getByText("two")).toBeInTheDocument();
    });
});
