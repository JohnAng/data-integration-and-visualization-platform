/**
 * AppShell — the persistent chrome wrapping every route. Renders the
 * Navbar at the top, a centred main column for the route's content,
 * and the Footer at the bottom.
 */
import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

/**
 * Standard chrome wrapped around every routed page: top navbar, page
 * content in a flex-grow main, then the footer. Routes that need the
 * default container width should wrap their content in `<PageContainer>`.
 */
export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}

export function PageContainer({
    children,
    width = "default",
}: {
    children: ReactNode;
    width?: "default" | "wide" | "prose";
}) {
    const widthClass = {
        default: "max-w-(--container-default)",
        wide: "max-w-(--container-wide)",
        prose: "max-w-(--container-prose)",
    }[width];
    return (
        <div className={`${widthClass} mx-auto px-6 py-12`}>{children}</div>
    );
}
