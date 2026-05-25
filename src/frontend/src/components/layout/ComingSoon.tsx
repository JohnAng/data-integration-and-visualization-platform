/**
 * ComingSoon — placeholder card for routes whose backing data is not
 * yet implemented. Currently used only during development; kept for
 * potential future use when adding new resource types.
 */
interface ComingSoonProps {
    title: string;
    eyebrow?: string;
}

/**
 * Placeholder body shown by route stubs that are not yet implemented.
 * Used during the staged rollout so navigation works before each page
 * is built out.
 */
export function ComingSoon({ title, eyebrow }: ComingSoonProps) {
    return (
        <div className="text-center py-24">
            {eyebrow ? (
                <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                    {eyebrow}
                </p>
            ) : null}
            <h1 className="font-serif text-h1 text-navy">{title}</h1>
            <p className="font-serif italic text-lede text-slate mt-4 max-w-prose mx-auto">
                This page is part of the staged rollout and lights up in a
                subsequent commit.
            </p>
        </div>
    );
}
