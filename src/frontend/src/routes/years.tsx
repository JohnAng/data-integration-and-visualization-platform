/**
 * Years layout shell — renders an <Outlet /> so that years.index.tsx
 * (the list) or years.$year.tsx (the year detail) can mount.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/years")({
    component: () => <Outlet />,
});
