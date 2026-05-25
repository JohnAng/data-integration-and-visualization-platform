import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
    it("renders an animated linen-toned placeholder", () => {
        render(<Skeleton data-testid="skeleton" />);
        const skeleton = screen.getByTestId("skeleton");
        expect(skeleton.className).toContain("animate-pulse");
        expect(skeleton.className).toContain("bg-linen");
    });

    it("merges user className with defaults", () => {
        render(<Skeleton data-testid="skeleton" className="h-12 w-24" />);
        const skeleton = screen.getByTestId("skeleton");
        expect(skeleton.className).toContain("h-12");
        expect(skeleton.className).toContain("w-24");
    });
});
