import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComingSoon } from "./ComingSoon";

describe("ComingSoon", () => {
    it("renders the title and the staged-rollout message", () => {
        render(<ComingSoon title="Future page" />);
        expect(screen.getByText("Future page")).toBeInTheDocument();
        expect(
            screen.getByText(/staged rollout/i),
        ).toBeInTheDocument();
    });

    it("renders the optional eyebrow", () => {
        render(<ComingSoon eyebrow="Lab" title="Future page" />);
        expect(screen.getByText("Lab")).toBeInTheDocument();
    });
});
