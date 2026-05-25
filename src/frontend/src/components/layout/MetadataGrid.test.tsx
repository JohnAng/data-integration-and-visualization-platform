import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetadataGrid } from "./MetadataGrid";

describe("MetadataGrid", () => {
    it("renders label/value pairs in a description list", () => {
        render(
            <MetadataGrid
                entries={[
                    { label: "Publisher", value: "IEEE" },
                    { label: "Country", value: "USA" },
                ]}
            />,
        );
        expect(screen.getByText("Publisher")).toBeInTheDocument();
        expect(screen.getByText("IEEE")).toBeInTheDocument();
        expect(screen.getByText("Country")).toBeInTheDocument();
        expect(screen.getByText("USA")).toBeInTheDocument();
    });

    it("filters out null values", () => {
        render(
            <MetadataGrid
                entries={[
                    { label: "Publisher", value: null },
                    { label: "Country", value: "USA" },
                ]}
            />,
        );
        expect(screen.queryByText("Publisher")).not.toBeInTheDocument();
        expect(screen.getByText("Country")).toBeInTheDocument();
    });

    it("filters out em dash values", () => {
        render(
            <MetadataGrid
                entries={[
                    { label: "Publisher", value: "—" },
                    { label: "Country", value: "USA" },
                ]}
            />,
        );
        expect(screen.queryByText("Publisher")).not.toBeInTheDocument();
    });

    it("returns nothing when every entry is empty", () => {
        const { container } = render(
            <MetadataGrid
                entries={[
                    { label: "A", value: null },
                    { label: "B", value: "—" },
                ]}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders React node values", () => {
        render(
            <MetadataGrid
                entries={[{ label: "Rank", value: <strong>A*</strong> }]}
            />,
        );
        expect(screen.getByText("A*")).toBeInTheDocument();
    });
});
