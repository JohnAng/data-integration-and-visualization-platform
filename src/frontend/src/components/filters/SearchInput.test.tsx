import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
    it("renders the placeholder text", () => {
        render(
            <SearchInput
                value=""
                onChange={() => undefined}
                placeholder="Search…"
            />,
        );
        expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
    });

    it("updates the displayed value as the user types", async () => {
        render(<SearchInput value="" onChange={() => undefined} />);
        const input = screen.getByRole("searchbox");
        await userEvent.type(input, "hello");
        expect(input).toHaveValue("hello");
    });

    it("emits the debounced value to onChange after the delay", async () => {
        const onChange = vi.fn();
        render(
            <SearchInput
                value=""
                onChange={onChange}
                debounceMs={50}
            />,
        );
        const input = screen.getByRole("searchbox");
        await userEvent.type(input, "abc");
        await waitFor(
            () => expect(onChange).toHaveBeenLastCalledWith("abc"),
            { timeout: 500 },
        );
    });

    it("syncs the local value to changes from the parent prop", () => {
        const { rerender } = render(
            <SearchInput value="initial" onChange={() => undefined} />,
        );
        expect(screen.getByRole("searchbox")).toHaveValue("initial");
        rerender(<SearchInput value="updated" onChange={() => undefined} />);
        expect(screen.getByRole("searchbox")).toHaveValue("updated");
    });
});
