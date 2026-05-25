import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebounce } from "./useDebounce";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("useDebounce", () => {
    it("returns the initial value immediately", () => {
        const { result } = renderHook(() => useDebounce("first", 250));
        expect(result.current).toBe("first");
    });

    it("does not emit intermediate updates", () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
            initialProps: { value: "a" },
        });

        rerender({ value: "b" });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(result.current).toBe("a");
    });

    it("emits the final value once the delay elapses", () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
            initialProps: { value: "a" },
        });
        rerender({ value: "b" });
        act(() => {
            vi.advanceTimersByTime(250);
        });
        expect(result.current).toBe("b");
    });
});
