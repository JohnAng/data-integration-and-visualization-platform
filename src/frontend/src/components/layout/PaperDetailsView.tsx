/**
 * PaperDetailsView — full single-article surface used by both journal
 * and conference paper-detail routes. Renders title, year, pages, the
 * full author list as linked chips, and a link out to the original URL.
 */
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { ErrorCard } from "../feedback/ErrorCard";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { MetadataGrid, type MetadataEntry } from "./MetadataGrid";
import { PageContainer } from "./AppShell";
import { PageHeader } from "./PageHeader";
import type { PaperDetails } from "../../api/types";

type VenueProfileLink =
    | { to: "/journals/$journalId"; params: { journalId: string } }
    | { to: "/conferences/$conferenceId"; params: { conferenceId: string } };

interface PaperDetailsViewProps {
    paper: PaperDetails | undefined;
    isLoading: boolean;
    error: unknown;
    onRetry: () => void;
    venueBackLink: { label: string; to: "/journals" | "/conferences" };
    venueProfileLink: VenueProfileLink;
}

/**
 * Shared body for the two paper detail routes. Renders the eyebrow,
 * title, italic lede mentioning the venue, an authors card with pill
 * links to each author profile, and a bibliographic record card with
 * year, pages, and the original DBLP URL.
 */
export function PaperDetailsView({
    paper,
    isLoading,
    error,
    onRetry,
    venueBackLink,
    venueProfileLink,
}: PaperDetailsViewProps) {
    if (error) {
        return (
            <PageContainer width="prose">
                <ErrorCard error={error} onRetry={onRetry} />
            </PageContainer>
        );
    }

    const bibliographicEntries: MetadataEntry[] = paper
        ? [
              { label: "Year", value: paper.year ?? "—" },
              { label: "Pages", value: paper.pages ?? "—" },
              {
                  label: "Source URL",
                  value: paper.url ? (
                      <a
                          href={
                              paper.url.startsWith("http")
                                  ? paper.url
                                  : `https://dblp.org/${paper.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 text-navy hover:text-ochre transition-colors duration-100 font-mono text-body-sm break-all max-w-full"
                      >
                          <span className="break-all">{paper.url}</span>
                          <ArrowUpRight
                              className="size-3 shrink-0 mt-1"
                              strokeWidth={1.5}
                          />
                      </a>
                  ) : (
                      "—"
                  ),
              },
          ]
        : [];

    return (
        <PageContainer width="prose">
            <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                <Link
                    to={venueBackLink.to}
                    search={() => ({ page: 1 }) as never}
                    className="hover:text-ochre"
                >
                    ← {venueBackLink.label}
                </Link>
            </p>

            {isLoading ? (
                <Skeleton className="h-24 w-3/4 mb-12" />
            ) : paper ? (
                <PageHeader
                    eyebrow={
                        paper.venue_type === "journal"
                            ? `Journal article${paper.year ? ` · ${paper.year}` : ""}`
                            : `Conference paper${paper.year ? ` · ${paper.year}` : ""}`
                    }
                    title={paper.title}
                    lede={
                        <>
                            Published in{" "}
                            {venueProfileLink.to === "/journals/$journalId" ? (
                                <Link
                                    to={venueProfileLink.to}
                                    params={venueProfileLink.params}
                                    search={() => ({}) as never}
                                    className="text-navy hover:text-ochre transition-colors duration-100 not-italic"
                                >
                                    {paper.venue_title}
                                </Link>
                            ) : (
                                <Link
                                    to={venueProfileLink.to}
                                    params={venueProfileLink.params}
                                    search={() => ({}) as never}
                                    className="text-navy hover:text-ochre transition-colors duration-100 not-italic"
                                >
                                    {paper.venue_title}
                                </Link>
                            )}
                            .
                        </>
                    }
                />
            ) : null}

            {isLoading ? (
                <Skeleton className="h-32 mb-8" />
            ) : paper ? (
                <Card className="mb-8">
                    <p className="text-caption uppercase tracking-wide text-smoke mb-4">
                        Authors · {paper.authors.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {paper.authors.length === 0 ? (
                            <span className="text-body-sm italic text-slate">
                                No authors indexed for this paper.
                            </span>
                        ) : (
                            paper.authors.map((author) => (
                                <Link
                                    key={author.author_id}
                                    to="/authors/$authorId"
                                    params={{ authorId: String(author.author_id) }}
                                    search={() => ({ page: 1 }) as never}
                                    className="inline-flex items-center px-3 py-1 rounded-xs border border-hairline bg-cream text-body-sm text-navy hover:bg-linen transition-colors duration-100"
                                >
                                    {author.author_name}
                                </Link>
                            ))
                        )}
                    </div>
                </Card>
            ) : null}

            {!isLoading && paper ? <MetadataGrid entries={bibliographicEntries} columns={3} /> : null}
        </PageContainer>
    );
}
