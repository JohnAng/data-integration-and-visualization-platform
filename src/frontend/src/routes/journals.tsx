/**
 * Journals layout shell — renders an <Outlet /> so that
 * journals.index.tsx, journals.$journalId, or the paper-detail route
 * can mount.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/journals")({
    component: () => <Outlet />,
});
