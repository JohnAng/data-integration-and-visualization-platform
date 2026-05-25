/**
 * Conference detail layout shell — renders an <Outlet /> so that
 * conferences.$conferenceId.index.tsx (the profile) or the
 * paper-detail route can mount under /conferences/$conferenceId.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/conferences/$conferenceId")({
    component: () => <Outlet />,
});
