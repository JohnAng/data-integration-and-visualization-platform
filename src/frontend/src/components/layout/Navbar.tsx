/**
 * Navbar — sticky top navigation. Six entries (Dashboard, Journals,
 * Conferences, Authors, Years, Charts) wired to TanStack Router with
 * an active-state underline driven by the current route.
 */
import { Link } from "@tanstack/react-router";

import { cn } from "../../lib/cn";

interface NavItem {
    label: string;
    to: string;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Journals", to: "/journals" },
    { label: "Conferences", to: "/conferences" },
    { label: "Authors", to: "/authors" },
    { label: "Years", to: "/years" },
    { label: "Charts", to: "/charts" },
];

export function Navbar() {
    return (
        <header className="border-b border-hairline bg-cream sticky top-0 z-30">
            <div className="max-w-(--container-default) mx-auto px-6 h-16 flex items-center justify-between gap-6">
                <Link
                    to="/"
                    className="font-serif text-h4 text-navy shrink-0"
                >
                    MYE030
                </Link>
                <nav className="flex items-center gap-6">
                    {NAV_ITEMS.map((item) => (
                        <NavLink key={item.to} {...item} />
                    ))}
                </nav>
            </div>
        </header>
    );
}

function NavLink({ to, label }: NavItem) {
    return (
        <Link
            to={to}
            className={cn(
                "relative text-body-sm text-slate hover:text-navy transition-colors duration-100",
                "after:absolute after:left-0 after:right-0 after:-bottom-5",
                "after:h-[2px] after:bg-navy after:scale-x-0 after:transition-transform after:duration-100",
            )}
            activeProps={{
                className: "text-navy after:scale-x-100",
            }}
            activeOptions={{ exact: false }}
        >
            {label}
        </Link>
    );
}
