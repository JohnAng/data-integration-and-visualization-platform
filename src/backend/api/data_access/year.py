"""Data access object for year-centric resources."""

from typing import Any

from api.database import Database
from api.schemas.common import RESULT_HARD_CAP
from api.sql_helpers import build_order_clause, trim_partial_last_year


YEAR_JOURNAL_ORDER_COLUMNS: dict[str, str] = {
    "title": "journal.title",
    "publisher": "journal.publisher",
    "best_quartile": "journal.best_quartile",
    "sjr_index": "journal.sjr_index",
    "articles_in_year": "articles_in_year",
}

YEAR_CONFERENCE_ORDER_COLUMNS: dict[str, str] = {
    "title": "conference.title",
    "acronym": "conference.acronym",
    "rank_value": "conference.rank_value",
    "articles_in_year": "articles_in_year",
}

YEAR_ARTICLE_ORDER_COLUMNS: dict[str, str] = {
    "title": "title",
    "venue_title": "venue_title",
    "venue_type": "venue_type",
}


class YearDataAccess:
    """Reads the per-year aggregate view and related fact joins."""

    def __init__(self, database: Database) -> None:
        self._database: Database = database

    async def list_summaries(
        self,
        *,
        start_year: int | None = None,
        end_year: int | None = None,
        include_partial_last_year: bool = False,
    ) -> list[dict[str, Any]]:
        """Return per-year totals over the optional year range.

        Trims a trailing partial year by default so consumers do not
        have to re-implement the heuristic. Pass
        ``include_partial_last_year=True`` for the raw row.
        """
        conditions: list[str] = []
        parameters: list[Any] = []
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = (
            "SELECT year, journal_articles, conference_articles, "
            "total_articles, distinct_journals, distinct_conferences, "
            "distinct_authors, total_authors "
            f"FROM materialized_year_summary {where_clause} ORDER BY year"
        )
        rows = await self._database.fetch_all(query, tuple(parameters))
        if include_partial_last_year:
            return rows
        return trim_partial_last_year(rows, "total_articles")

    async def fetch_summary(self, year: int) -> dict[str, Any] | None:
        """Return the year-summary row for a single year, or None."""
        query = (
            "SELECT year, journal_articles, conference_articles, "
            "total_articles, distinct_journals, distinct_conferences, "
            "distinct_authors, total_authors "
            "FROM materialized_year_summary WHERE year = %s"
        )
        return await self._database.fetch_one(query, (year,))

    async def list_year_journals(
        self,
        year: int,
        *,
        page: int,
        page_size: int,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return journals that published articles in the requested year."""
        count_query = (
            "SELECT COUNT(DISTINCT article.journal_id) AS total "
            "FROM fact_journal_articles AS article "
            "WHERE article.year = %s"
        )
        count_row = await self._database.fetch_one(count_query, (year,))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            YEAR_JOURNAL_ORDER_COLUMNS,
            "articles_in_year DESC, journal.title",
        )
        list_query = (
            "SELECT journal.journal_id, journal.title, journal.publisher, "
            "journal.best_quartile, journal.best_subject_area, "
            "journal.sjr_index, COUNT(article.article_id) AS articles_in_year "
            "FROM lookup_journals AS journal "
            "JOIN fact_journal_articles AS article "
            "ON article.journal_id = journal.journal_id "
            "WHERE article.year = %s "
            "GROUP BY journal.journal_id, journal.title, journal.publisher, "
            "journal.best_quartile, journal.best_subject_area, journal.sjr_index "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        parameters = (year, min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, parameters)
        return rows, total_items

    async def list_year_articles(
        self,
        year: int,
        *,
        page: int,
        page_size: int,
        conference_id: int | None = None,
        journal_id: int | None = None,
        author_id: int | None = None,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """
        Return every article published in the year, optionally narrowed by
        a specific conference, journal, or author.

        Mutually-exclusive venue filters short-circuit the unrelated fact
        table out of the UNION ALL. The author filter joins through the
        matching bridge so only articles co-authored by that author remain.
        """
        include_journals = conference_id is None
        include_conferences = journal_id is None

        union_parts: list[str] = []
        parameters: list[Any] = []

        if include_journals:
            journal_part = (
                "SELECT article.article_id, article.title, "
                "'journal' AS venue_type, "
                "journal.journal_id AS venue_id, journal.title AS venue_title, "
                "article.pages, article.url "
                "FROM fact_journal_articles AS article "
                "JOIN lookup_journals AS journal "
                "ON journal.journal_id = article.journal_id"
            )
            where_pieces: list[str] = ["article.year = %s"]
            parameters.append(year)
            if author_id is not None:
                journal_part += (
                    " JOIN bridge_journal_article_authors AS bridge "
                    "ON bridge.article_id = article.article_id"
                )
                where_pieces.append("bridge.author_id = %s")
                parameters.append(author_id)
            if journal_id is not None:
                where_pieces.append("journal.journal_id = %s")
                parameters.append(journal_id)
            union_parts.append(journal_part + " WHERE " + " AND ".join(where_pieces))

        if include_conferences:
            conference_part = (
                "SELECT article.article_id, article.title, "
                "'conference' AS venue_type, "
                "conference.conference_id AS venue_id, conference.title AS venue_title, "
                "article.pages, article.url "
                "FROM fact_conference_articles AS article "
                "JOIN lookup_conferences AS conference "
                "ON conference.conference_id = article.conference_id"
            )
            where_pieces = ["article.year = %s"]
            parameters.append(year)
            if author_id is not None:
                conference_part += (
                    " JOIN bridge_conference_article_authors AS bridge "
                    "ON bridge.article_id = article.article_id"
                )
                where_pieces.append("bridge.author_id = %s")
                parameters.append(author_id)
            if conference_id is not None:
                where_pieces.append("conference.conference_id = %s")
                parameters.append(conference_id)
            union_parts.append(conference_part + " WHERE " + " AND ".join(where_pieces))

        if not union_parts:
            return [], 0

        union_query = " UNION ALL ".join(union_parts)

        count_query = f"SELECT COUNT(*) AS total FROM ({union_query}) AS articles"
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            YEAR_ARTICLE_ORDER_COLUMNS,
            "venue_type, venue_title, article_id",
        )
        list_query = (
            f"SELECT * FROM ({union_query}) AS articles "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items

    async def list_year_conferences(
        self,
        year: int,
        *,
        page: int,
        page_size: int,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return conferences that held papers in the requested year."""
        count_query = (
            "SELECT COUNT(DISTINCT article.conference_id) AS total "
            "FROM fact_conference_articles AS article "
            "WHERE article.year = %s"
        )
        count_row = await self._database.fetch_one(count_query, (year,))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            YEAR_CONFERENCE_ORDER_COLUMNS,
            "articles_in_year DESC, conference.title",
        )
        list_query = (
            "SELECT conference.conference_id, conference.title, "
            "conference.acronym, conference.rank_value, conference.primary_for, "
            "field_of_research.description AS primary_for_description, "
            "COUNT(article.article_id) AS articles_in_year "
            "FROM lookup_conferences AS conference "
            "JOIN fact_conference_articles AS article "
            "ON article.conference_id = conference.conference_id "
            "LEFT JOIN lookup_field_of_research_categories AS field_of_research "
            "ON field_of_research.code = conference.primary_for "
            "WHERE article.year = %s "
            "GROUP BY conference.conference_id, conference.title, conference.acronym, "
            "conference.rank_value, conference.primary_for, field_of_research.description "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        parameters = (year, min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, parameters)
        return rows, total_items
