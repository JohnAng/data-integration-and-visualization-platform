import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TablePager } from "./TablePager";

describe("TablePager", () => {
    it("displays the current item range and total count", () => {
        render(
            <TablePager
                page={1}
                pageSize={50}
                totalItems={1000}
                onPageChange={() => undefined}
            />,
        );
        expect(screen.getByText(/1–50/)).toBeInTheDocument();
        expect(screen.getByText(/1,000/)).toBeInTheDocument();
    });

    it("renders zero range when there are no items", () => {
        render(
            <TablePager
                page={1}
                pageSize={50}
                totalItems={0}
                onPageChange={() => undefined}
            />,
        );
        expect(screen.getByText(/^0–0/)).toBeInTheDocument();
    });

    it("disables the previous button on the first page", () => {
        render(
            <TablePager
                page={1}
                pageSize={50}
                totalItems={100}
                onPageChange={() => undefined}
            />,
        );
        expect(
            screen.getByRole("button", { name: "Previous page" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Next page" }),
        ).not.toBeDisabled();
    });

    it("disables the next button on the last page", () => {
        render(
            <TablePager
                page={2}
                pageSize={50}
                totalItems={100}
                onPageChange={() => undefined}
            />,
        );
        expect(
            screen.getByRole("button", { name: "Next page" }),
        ).toBeDisabled();
    });

    it("invokes onPageChange with the next page", async () => {
        const onPageChange = vi.fn();
        render(
            <TablePager
                page={1}
                pageSize={50}
                totalItems={500}
                onPageChange={onPageChange}
            />,
        );
        await userEvent.click(screen.getByRole("button", { name: "Next page" }));
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("invokes onPageChange with the previous page", async () => {
        const onPageChange = vi.fn();
        render(
            <TablePager
                page={3}
                pageSize={50}
                totalItems={500}
                onPageChange={onPageChange}
            />,
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Previous page" }),
        );
        expect(onPageChange).toHaveBeenCalledWith(2);
    });
});
