import type { ProblemDetails } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

/**
 * Error thrown by apiFetch whenever the response status indicates failure.
 * Carries the parsed RFC 7807 body so the UI can render structured errors.
 */
export class ApiError extends Error {
    public readonly problem: ProblemDetails;
    public readonly status: number;

    constructor(problem: ProblemDetails, status: number) {
        super(problem.title);
        this.problem = problem;
        this.status = status;
        this.name = "ApiError";
    }
}

/**
 * Convert a partial query object into a URLSearchParams string, dropping
 * undefined and null values so optional filters do not leak into the URL.
 * Arrays of primitives serialize as repeated keys, matching FastAPI's
 * default Query parameter shape (e.g. ?venue_ids=1&venue_ids=2).
 */
export function serializeQuery(input: object | undefined): string {
    if (!input) {
        return "";
    }
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(input) as [string, unknown][]) {
        if (value === undefined || value === null) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const member of value) {
                if (member !== undefined && member !== null) {
                    parameters.append(key, String(member));
                }
            }
            continue;
        }
        parameters.append(key, String(value));
    }
    const serialized = parameters.toString();
    return serialized ? `?${serialized}` : "";
}

/**
 * Thin wrapper around fetch that strips the API base URL and centralises
 * JSON parsing and error mapping. Every TanStack Query hook uses this.
 */
export async function apiFetch<ResponseType>(
    path: string,
    init?: RequestInit,
): Promise<ResponseType> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            ...init?.headers,
        },
    });
    if (!response.ok) {
        let problem: ProblemDetails;
        try {
            problem = (await response.json()) as ProblemDetails;
        } catch {
            problem = {
                type: "about:blank",
                title: response.statusText || "Request failed",
                status: response.status,
                detail: `Unexpected ${response.status} response with no problem body.`,
            };
        }
        throw new ApiError(problem, response.status);
    }
    return (await response.json()) as ResponseType;
}
