/**
 * Authors layout shell — renders only an <Outlet /> so that
 * authors.index.tsx (the list) or authors.$authorId.tsx (the profile)
 * can mount under /authors.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/authors")({
    component: () => <Outlet />,
});
