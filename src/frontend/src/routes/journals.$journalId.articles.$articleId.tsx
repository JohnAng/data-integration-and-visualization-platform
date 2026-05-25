/**
 * Journal paper detail route
 * ("/journals/$journalId/articles/$articleId") — full single article
 * surface with title, year, pages, URL and the complete author list
 * rendered through <PaperDetailsView />.
 */
import { createFileRoute } from "@tanstack/react-router";

import { useJournalPaper } from "../api/queries";
import { AppShell } from "../components/layout/AppShell";
import { PaperDetailsView } from "../components/layout/PaperDetailsView";

export const Route = createFileRoute("/journals/$journalId/articles/$articleId")({
    component: JournalPaperPage,
});

function JournalPaperPage() {
    const { journalId, articleId } = Route.useParams();
    const journalIdNumber = Number.parseInt(journalId, 10);
    const articleIdNumber = Number.parseInt(articleId, 10);

    const paperQuery = useJournalPaper(journalIdNumber, articleIdNumber);

    return (
        <AppShell>
            <PaperDetailsView
                paper={paperQuery.data}
                isLoading={paperQuery.isPending}
                error={paperQuery.isError ? paperQuery.error : null}
                onRetry={() => paperQuery.refetch()}
                venueBackLink={{ label: "Journals", to: "/journals" }}
                venueProfileLink={{
                    to: "/journals/$journalId",
                    params: { journalId },
                }}
            />
        </AppShell>
    );
}
