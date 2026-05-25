"""Data access object for meta-information about the corpus."""

from typing import Any

from api.database import Database


class MetaDataAccess:
    """Reads the single-row ``view_corpus_totals`` aggregate."""

    def __init__(self, database: Database) -> None:
        self._database: Database = database

    async def fetch_totals(self) -> dict[str, Any]:
        """Return the headline corpus counts from the database view.

        The view always materializes one row; an empty database still
        produces a row of zeros plus null bounds, so the caller never
        receives None.
        """
        query = (
            "SELECT total_articles, total_journal_articles, "
            "total_conference_articles, total_authors, total_journals, "
            "total_conferences, earliest_year, latest_year "
            "FROM view_corpus_totals"
        )
        row = await self._database.fetch_one(query, ())
        return row if row is not None else {}

    async def fetch_filter_options(self) -> dict[str, list[dict[str, Any]]]:
        """Return the distinct values that feed the filter dropdowns.

        Every option list is filtered to entries that actually have data
        in the chart-backing materialised tables, so the UI never
        offers a checkbox that would render a blank line. Subject areas
        come from ``materialized_subject_area_yearly_summary``, Field
        of Research codes from ``materialized_field_of_research_yearly_summary``
        joined with the human-readable lookup, publishers from
        ``lookup_journals`` (which already feeds the publisher bar chart)
        and conference ranks from ``lookup_conferences``.
        """
        subject_area_rows = await self._database.fetch_all(
            "SELECT best_subject_area AS value, "
            "       SUM(articles_count) AS article_total "
            "FROM materialized_subject_area_yearly_summary "
            "GROUP BY best_subject_area "
            "HAVING article_total > 0 "
            "ORDER BY best_subject_area",
            (),
        )
        publisher_rows = await self._database.fetch_all(
            "SELECT publisher AS value, COUNT(*) AS journal_count "
            "FROM lookup_journals "
            "WHERE publisher IS NOT NULL "
            "GROUP BY publisher "
            "HAVING journal_count > 0 "
            "ORDER BY journal_count DESC, publisher ASC",
            (),
        )
        for_rows = await self._database.fetch_all(
            "SELECT summary.primary_for AS code, "
            "       MAX(summary.primary_for_description) AS description, "
            "       SUM(summary.articles_count) AS article_total "
            "FROM materialized_field_of_research_yearly_summary AS summary "
            "GROUP BY summary.primary_for "
            "HAVING article_total > 0 "
            "ORDER BY summary.primary_for",
            (),
        )
        rank_rows = await self._database.fetch_all(
            "SELECT rank_value AS value, COUNT(*) AS conference_count "
            "FROM lookup_conferences "
            "WHERE rank_value IS NOT NULL "
            "GROUP BY rank_value "
            "HAVING conference_count > 0 "
            "ORDER BY FIELD(rank_value, 'A*', 'A', 'B', 'C', 'Multiconference')",
            (),
        )
        return {
            "subject_areas": [row["value"] for row in subject_area_rows],
            "publishers": [
                {"name": row["value"], "journal_count": int(row["journal_count"])}
                for row in publisher_rows
            ],
            "fields_of_research": [
                {"code": row["code"], "description": row["description"]}
                for row in for_rows
            ],
            "conference_ranks": [row["value"] for row in rank_rows],
        }
