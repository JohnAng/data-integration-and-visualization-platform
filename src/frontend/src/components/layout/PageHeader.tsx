/**
 * PageHeader — editorial header used on every non-landing route.
 * Renders an uppercase eyebrow (resource type), an H1 serif title and
 * an italic lede paragraph in slate body type.
 */
import type { ReactNode } from "react";

interface PageHeaderProps {
    eyebrow?: string;
    title: string;
    lede?: ReactNode;
    actions?: ReactNode;
}

/**
 * Editorial header block shown at the top of every non-landing page.
 * Eyebrow sits above the title in caption type; lede is an italic
 * Crimson Pro paragraph beneath. Actions render to the right on wide
 * viewports and stack below the lede on narrow ones.
 */
export function PageHeader({ eyebrow, title, lede, actions }: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-12">
            <div>
                {eyebrow ? (
                    <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                        {eyebrow}
                    </p>
                ) : null}
                <h1 className="font-serif text-h1 text-navy">{title}</h1>
                {lede ? (
                    <p className="font-serif italic text-lede text-slate mt-4 max-w-prose">
                        {lede}
                    </p>
                ) : null}
            </div>
            {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </header>
    );
}
