/**
 * Root route — wraps every page in <AppShell> (Navbar + main slot +
 * Footer) and renders the TanStack Router Devtools only in dev builds.
 * Every other route file is a child of this one.
 */
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <>
            <Outlet />
            {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
        </>
    );
}
