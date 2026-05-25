/**
 * Application entry point.
 *
 * Wires the three pieces every page depends on:
 * - QueryClient (TanStack Query) with 5-min staleTime and 30-min gcTime
 * - Router (TanStack Router) backed by the generated routeTree
 * - DevTools — rendered only in dev builds (import.meta.env.DEV)
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient },
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Root element with id 'root' is missing in index.html");
}

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
    </StrictMode>,
);
