import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectFilter } from "./SelectFilter";

describe("SelectFilter", () => {
    it("renders the placeholder option", () => {
        render(
            <SelectFilter
                value={undefined}
                onChange={() => undefined}
                options={[
                    { value: "Q1", label: "Q1" },
                    { value: "Q2", label: "Q2" },
                ]}
                placeholder="All quartiles"
            />,
        );
        expect(screen.getByRole("combobox")).toHaveValue("");
        expect(screen.getByRole("option", { name: "All quartiles" })).toBeInTheDocument();
    });

    it("renders every option", () => {
        render(
            <SelectFilter
                value="Q1"
                onChange={() => undefined}
                options={[
                    { value: "Q1", label: "Q1" },
                    { value: "Q2", label: "Q2" },
                ]}
            />,
        );
        expect(screen.getByRole("option", { name: "Q1" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Q2" })).toBeInTheDocument();
    });

    it("invokes onChange with the new value", async () => {
        const onChange = vi.fn();
        render(
            <SelectFilter
                value={undefined}
                onChange={onChange}
                options={[
                    { value: "Q1", label: "Q1" },
                    { value: "Q2", label: "Q2" },
                ]}
            />,
        );
        await userEvent.selectOptions(screen.getByRole("combobox"), "Q1");
        expect(onChange).toHaveBeenCalledWith("Q1");
    });

    it("invokes onChange with undefined when the placeholder is reselected", async () => {
        const onChange = vi.fn();
        render(
            <SelectFilter
                value="Q1"
                onChange={onChange}
                options={[{ value: "Q1", label: "Q1" }]}
                placeholder="All"
            />,
        );
        await userEvent.selectOptions(screen.getByRole("combobox"), "All");
        expect(onChange).toHaveBeenCalledWith(undefined);
    });
});
