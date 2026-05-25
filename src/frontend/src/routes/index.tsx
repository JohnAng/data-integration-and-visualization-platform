/**
 * Landing route ("/") — editorial hero with three KPI tiles
 * (articles, authors, venues) sourced from /api/meta/totals, and a
 * call-to-action that links into the dashboard.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useCorpusTotals } from "../api/queries";
import { ErrorCard } from "../components/feedback/ErrorCard";
import { Footer } from "../components/layout/Footer";
import { MetricsGrid, MetricTile } from "../components/metrics/MetricTile";
import { formatCompact, formatNullable, formatThousands } from "../lib/formatNumber";

export const Route = createFileRoute("/")({
    component: LandingPage,
});

function LandingPage() {
    const totalsQuery = useCorpusTotals();
    const totals = totalsQuery.data;
    const isLoading = totalsQuery.isPending;

    const yearSpan =
        totals?.earliest_year != null && totals?.latest_year != null
            ? `${totals.earliest_year}–${totals.latest_year}`
            : null;

    const venuesCount =
        totals != null ? totals.total_journals + totals.total_conferences : null;

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b border-hairline">
                <div className="max-w-(--container-default) mx-auto px-6 py-5 flex items-center justify-between">
                    <Link to="/" className="font-serif text-h4 text-navy">
                        MYE030
                    </Link>
                    <p className="text-caption uppercase tracking-wide text-smoke">
                        Data Integration &amp; Visualization
                    </p>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
                <p className="text-caption uppercase text-smoke tracking-wide">
                    University of Ioannina · Spring 2026
                </p>

                <h1 className="font-serif text-display text-navy mt-6 max-w-[18ch] text-center">
                    Bibliographic data, read like a journal.
                </h1>

                <p className="font-serif italic text-lede text-slate mt-6 max-w-prose text-center">
                    A reading surface for the DBLP corpus, the Kaggle journal
                    rankings, and the iCore26 conference rankings. Built as a
                    coursework deliverable for MYE030.
                </p>

                <Link
                    to="/dashboard"
                    className="mt-12 inline-flex items-center gap-2 h-12 px-5 rounded-sm
                               bg-navy text-cream font-sans font-medium
                               hover:bg-navy/90 transition-colors duration-100"
                >
                    Enter the dashboard
                    <ArrowRight className="size-4" strokeWidth={1.5} />
                </Link>

                <div className="mt-20 w-full max-w-2xl">
                    {totalsQuery.isError ? (
                        <ErrorCard
                            error={totalsQuery.error}
                            onRetry={() => totalsQuery.refetch()}
                        />
                    ) : (
                        <MetricsGrid columns={3}>
                            <MetricTile
                                label="Articles"
                                value={formatNullable(totals?.total_articles, formatCompact)}
                                sublabel={
                                    totals != null
                                        ? `${formatThousands(totals.total_articles)} indexed`
                                        : undefined
                                }
                                isLoading={isLoading}
                            />
                            <MetricTile
                                label="Authors"
                                value={formatNullable(totals?.total_authors, formatCompact)}
                                sublabel={
                                    totals != null
                                        ? `${formatThousands(totals.total_authors)} unique`
                                        : undefined
                                }
                                isLoading={isLoading}
                            />
                            <MetricTile
                                label="Venues"
                                value={formatNullable(venuesCount, formatCompact)}
                                sublabel={yearSpan ?? undefined}
                                isLoading={isLoading}
                            />
                        </MetricsGrid>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
