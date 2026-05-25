/**
 * Conference paper detail route
 * ("/conferences/$conferenceId/articles/$articleId") — full single
 * paper surface with title, year, pages, URL and the complete author
 * list rendered through <PaperDetailsView />.
 */
import { createFileRoute } from "@tanstack/react-router";

import { useConferencePaper } from "../api/queries";
import { AppShell } from "../components/layout/AppShell";
import { PaperDetailsView } from "../components/layout/PaperDetailsView";

export const Route = createFileRoute(
    "/conferences/$conferenceId/articles/$articleId",
)({
    component: ConferencePaperPage,
});

function ConferencePaperPage() {
    const { conferenceId, articleId } = Route.useParams();
    const conferenceIdNumber = Number.parseInt(conferenceId, 10);
    const articleIdNumber = Number.parseInt(articleId, 10);

    const paperQuery = useConferencePaper(conferenceIdNumber, articleIdNumber);

    return (
        <AppShell>
            <PaperDetailsView
                paper={paperQuery.data}
                isLoading={paperQuery.isPending}
                error={paperQuery.isError ? paperQuery.error : null}
                onRetry={() => paperQuery.refetch()}
                venueBackLink={{ label: "Conferences", to: "/conferences" }}
                venueProfileLink={{
                    to: "/conferences/$conferenceId",
                    params: { conferenceId },
                }}
            />
        </AppShell>
    );
}
