import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { routeTree } from "../routeTree.gen";

function buildQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
        },
    });
}

/**
 * Render a React tree that only depends on TanStack Query (no router).
 * Useful for component-level tests of UI primitives and presentational
 * pieces that don't read route params.
 */
export function renderWithQuery(ui: ReactElement): RenderResult & { queryClient: QueryClient } {
    const queryClient = buildQueryClient();
    const result = render(
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
    return Object.assign(result, { queryClient });
}

/**
 * Render the full TanStack Router tree starting at the given path. Use
 * this for route-level tests that need access to params, search params
 * and inter-route navigation. The router is created with a memory
 * history so tests stay isolated from window.location.
 */
export function renderApp(initialPath: string = "/"): {
    queryClient: QueryClient;
} {
    const queryClient = buildQueryClient();
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [initialPath] }),
        context: { queryClient },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router as never} />
        </QueryClientProvider>,
    );
    return { queryClient };
}
