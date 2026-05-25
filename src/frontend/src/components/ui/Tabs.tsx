/**
 * Tabs — thin re-export of @radix-ui/react-tabs styled to match the
 * design system. Used on the year-detail page (articles / journals /
 * conferences sub-views) and inside the charts playground.
 */
import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
    className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
    return (
        <RadixTabs.Root
            value={value}
            onValueChange={onValueChange}
            className={className}
        >
            {children}
        </RadixTabs.Root>
    );
}

export function TabsList({ children }: { children: ReactNode }) {
    return (
        <RadixTabs.List className="flex gap-6 border-b border-hairline mb-8">
            {children}
        </RadixTabs.List>
    );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
    return (
        <RadixTabs.Trigger
            value={value}
            className={cn(
                "relative pb-3 text-body-sm text-slate transition-colors duration-100",
                "hover:text-navy",
                "data-[state=active]:text-navy",
                "after:absolute after:left-0 after:right-0 after:-bottom-px",
                "after:h-[2px] after:bg-navy after:scale-x-0 after:transition-transform after:duration-100",
                "data-[state=active]:after:scale-x-100",
            )}
        >
            {children}
        </RadixTabs.Trigger>
    );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
    return <RadixTabs.Content value={value}>{children}</RadixTabs.Content>;
}
