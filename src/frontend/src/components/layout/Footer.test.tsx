import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./Footer";

describe("Footer", () => {
    it("renders the project credits and author attribution", () => {
        render(<Footer />);
        expect(screen.getByText(/MYE030/)).toBeInTheDocument();
        expect(
            screen.getByText(/Ioannis Angelakos · 2403/i),
        ).toBeInTheDocument();
    });
});
