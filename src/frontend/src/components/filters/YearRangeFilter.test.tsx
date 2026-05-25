import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { YearRangeFilter } from "./YearRangeFilter";

describe("YearRangeFilter", () => {
    it("renders two year inputs and an Apply button", () => {
        render(
            <YearRangeFilter
                startYear={undefined}
                endYear={undefined}
                onApply={() => undefined}
            />,
        );
        expect(screen.getByText("From")).toBeInTheDocument();
        expect(screen.getByText("To")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    });

    it("calls onApply with the parsed year range when Apply is clicked", async () => {
        const onApply = vi.fn();
        render(
            <YearRangeFilter
                startYear={undefined}
                endYear={undefined}
                onApply={onApply}
            />,
        );
        const fromInput = screen.getByPlaceholderText(/1900/);
        const toInput = screen.getByPlaceholderText(/2100/);
        await userEvent.clear(fromInput);
        await userEvent.type(fromInput, "1990");
        await userEvent.clear(toInput);
        await userEvent.type(toInput, "2020");
        await userEvent.click(screen.getByRole("button", { name: "Apply" }));
        expect(onApply).toHaveBeenCalledWith({
            startYear: 1990,
            endYear: 2020,
        });
    });

    it("returns undefined for values outside [minYear, maxYear]", async () => {
        const onApply = vi.fn();
        render(
            <YearRangeFilter
                startYear={undefined}
                endYear={undefined}
                minYear={2000}
                maxYear={2010}
                onApply={onApply}
            />,
        );
        const fromInput = screen.getByPlaceholderText("2000");
        await userEvent.clear(fromInput);
        await userEvent.type(fromInput, "1980");
        await userEvent.click(screen.getByRole("button", { name: "Apply" }));
        expect(onApply).toHaveBeenCalledWith({
            startYear: undefined,
            endYear: 2010,
        });
    });

    it("renders a Clear button only when the parent has a range", async () => {
        const onApply = vi.fn();
        const { rerender } = render(
            <YearRangeFilter
                startYear={undefined}
                endYear={undefined}
                onApply={onApply}
            />,
        );
        expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
        rerender(
            <YearRangeFilter
                startYear={1990}
                endYear={2010}
                onApply={onApply}
            />,
        );
        const clearButton = screen.getByRole("button", { name: "Clear" });
        await userEvent.click(clearButton);
        expect(onApply).toHaveBeenLastCalledWith({
            startYear: undefined,
            endYear: undefined,
        });
    });
});
