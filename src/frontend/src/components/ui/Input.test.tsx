import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./Input";

describe("Input", () => {
    it("renders as a text input by default", () => {
        render(<Input placeholder="type…" />);
        const input = screen.getByPlaceholderText("type…");
        expect(input.tagName).toBe("INPUT");
    });

    it("forwards onChange events", async () => {
        const handle = vi.fn();
        render(<Input onChange={handle} />);
        await userEvent.type(screen.getByRole("textbox"), "ab");
        expect(handle).toHaveBeenCalledTimes(2);
    });

    it("merges custom className with defaults", () => {
        render(<Input className="extra" />);
        expect(screen.getByRole("textbox").className).toContain("extra");
        expect(screen.getByRole("textbox").className).toContain("border-hairline");
    });

    it("supports disabled state", () => {
        render(<Input disabled />);
        expect(screen.getByRole("textbox")).toBeDisabled();
    });
});
