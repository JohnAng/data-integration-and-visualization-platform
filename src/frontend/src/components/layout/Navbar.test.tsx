import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderApp } from "../../test/render";

describe("Navbar", () => {
    it("renders the brand mark and every primary nav link", async () => {
        renderApp("/dashboard");
        expect(await screen.findByText("MYE030")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Journals" })).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Conferences" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Authors" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Years" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Charts" })).toBeInTheDocument();
    });

    it("links each nav entry to the correct route", async () => {
        renderApp("/dashboard");
        await screen.findByText("MYE030");
        expect(
            screen.getByRole("link", { name: "Journals" }).getAttribute("href"),
        ).toBe("/journals");
        expect(
            screen.getByRole("link", { name: "Years" }).getAttribute("href"),
        ).toBe("/years");
    });
});
