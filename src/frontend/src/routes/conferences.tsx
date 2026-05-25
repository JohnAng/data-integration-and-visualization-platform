/**
 * Conferences layout shell — renders an <Outlet /> so that
 * conferences.index.tsx, conferences.$conferenceId, or the
 * paper-detail route can mount.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/conferences")({
    component: () => <Outlet />,
});
