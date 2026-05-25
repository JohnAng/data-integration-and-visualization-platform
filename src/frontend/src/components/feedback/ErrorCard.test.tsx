import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../api/client";
import { ErrorCard } from "./ErrorCard";

describe("ErrorCard", () => {
    it("renders title and detail from an ApiError problem body", () => {
        const error = new ApiError(
            {
                type: "about:blank",
                title: "Not Found",
                status: 404,
                detail: "Resource X not found",
            },
            404,
        );
        render(<ErrorCard error={error} />);
        expect(screen.getByText("Not Found")).toBeInTheDocument();
        expect(screen.getByText("Resource X not found")).toBeInTheDocument();
    });

    it("falls back to Error.message for non-ApiError errors", () => {
        render(<ErrorCard error={new Error("network down")} />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
        expect(screen.getByText("network down")).toBeInTheDocument();
    });

    it("renders a generic message for non-Error values", () => {
        render(<ErrorCard error="something went wrong" />);
        expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });

    it("calls onRetry when the user clicks Retry", async () => {
        const onRetry = vi.fn();
        render(<ErrorCard error={new Error("oops")} onRetry={onRetry} />);
        await userEvent.click(screen.getByRole("button", { name: /retry/i }));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it("hides the Retry button when no onRetry prop is supplied", () => {
        render(<ErrorCard error={new Error("oops")} />);
        expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

    it("renders with alert role for accessibility", () => {
        render(<ErrorCard error={new Error("x")} />);
        expect(screen.getByRole("alert")).toBeInTheDocument();
    });
});
