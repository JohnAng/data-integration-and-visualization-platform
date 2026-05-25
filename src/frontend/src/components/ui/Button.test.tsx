import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
    it("renders children inside a button element by default", () => {
        render(<Button>Click me</Button>);
        const trigger = screen.getByRole("button", { name: "Click me" });
        expect(trigger.tagName).toBe("BUTTON");
    });

    it("forwards click events", async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Click</Button>);
        await userEvent.click(screen.getByRole("button", { name: "Click" }));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it("applies primary variant styles by default", () => {
        render(<Button>Default</Button>);
        const trigger = screen.getByRole("button");
        expect(trigger.className).toContain("bg-navy");
        expect(trigger.className).toContain("text-cream");
    });

    it("applies the destructive variant on request", () => {
        render(<Button variant="destructive">Delete</Button>);
        expect(screen.getByRole("button").className).toContain("bg-oxblood");
    });

    it("renders as the asChild element when asChild is true", () => {
        render(
            <Button asChild>
                <a href="/somewhere">Anchored</a>
            </Button>,
        );
        const anchor = screen.getByRole("link", { name: "Anchored" });
        expect(anchor.tagName).toBe("A");
        expect(anchor.getAttribute("href")).toBe("/somewhere");
    });

    it("merges user-provided className with the variant defaults", () => {
        render(<Button className="extra-thing">Custom</Button>);
        expect(screen.getByRole("button").className).toContain("extra-thing");
    });

    it("respects disabled state", () => {
        render(<Button disabled>Off</Button>);
        expect(screen.getByRole("button")).toBeDisabled();
    });
});
