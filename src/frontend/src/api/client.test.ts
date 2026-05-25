import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../test/server";
import { ApiError, apiFetch, serializeQuery } from "./client";

describe("serializeQuery", () => {
    it("returns empty string for undefined", () => {
        expect(serializeQuery(undefined)).toBe("");
    });

    it("returns empty string when every value is null or undefined", () => {
        expect(serializeQuery({ a: undefined, b: null })).toBe("");
    });

    it("serializes scalar values and prepends ?", () => {
        const result = serializeQuery({ page: 1, page_size: 50 });
        expect(result.startsWith("?")).toBe(true);
        expect(result).toContain("page=1");
        expect(result).toContain("page_size=50");
    });

    it("expands arrays into repeated keys", () => {
        const result = serializeQuery({ venue_ids: [1, 2, 3] });
        const parameters = new URLSearchParams(result.slice(1));
        expect(parameters.getAll("venue_ids")).toEqual(["1", "2", "3"]);
    });

    it("drops undefined and null values inside arrays", () => {
        const result = serializeQuery({ venue_ids: [1, null as never, undefined as never, 2] });
        const parameters = new URLSearchParams(result.slice(1));
        expect(parameters.getAll("venue_ids")).toEqual(["1", "2"]);
    });
});

describe("apiFetch", () => {
    it("resolves to the parsed body on a 2xx response", async () => {
        server.use(
            http.get("*/api/sample", () => HttpResponse.json({ name: "ok" })),
        );
        const body = await apiFetch<{ name: string }>("/sample");
        expect(body).toEqual({ name: "ok" });
    });

    it("throws ApiError with the parsed RFC 7807 body on failure", async () => {
        server.use(
            http.get("*/api/missing", () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "Not Found",
                        status: 404,
                        detail: "Resource X not found",
                    },
                    { status: 404 },
                ),
            ),
        );
        await expect(apiFetch("/missing")).rejects.toMatchObject({
            name: "ApiError",
            status: 404,
            problem: {
                title: "Not Found",
                detail: "Resource X not found",
            },
        });
    });

    it("falls back to a synthetic problem body when the server returns non-JSON", async () => {
        server.use(
            http.get("*/api/broken", () =>
                HttpResponse.text("plain text body", { status: 500 }),
            ),
        );
        try {
            await apiFetch("/broken");
            expect.fail("expected apiFetch to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            const apiError = error as ApiError;
            expect(apiError.status).toBe(500);
            expect(apiError.problem.title).toBeTruthy();
        }
    });
});
