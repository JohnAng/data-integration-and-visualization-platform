/**
 * Journal detail layout shell — renders an <Outlet /> so that
 * journals.$journalId.index.tsx (the profile) or the paper-detail
 * route can mount under /journals/$journalId.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/journals/$journalId")({
    component: () => <Outlet />,
});
