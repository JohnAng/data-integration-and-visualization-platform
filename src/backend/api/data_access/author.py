"""Data access object for author-centric resources."""

from typing import Any

from api.database import Database
from api.schemas.common import RESULT_HARD_CAP
from api.sql_helpers import build_order_clause, trim_partial_last_year


AUTHOR_LIST_ORDER_COLUMNS: dict[str, str] = {
    "author_name": "author_name",
    "author_id": "author_id",
    "total_articles": "total_articles",
    "earliest_year": "earliest_year",
    "latest_year": "latest_year",
}

AUTHOR_ARTICLE_ORDER_COLUMNS: dict[str, str] = {
    "title": "title",
    "year": "year",
    "venue_title": "venue_title",
    "venue_type": "venue_type",
}


class AuthorDataAccess:
    """Reads author tables, profile views and the unioned article bridge."""

    def __init__(self, database: Database) -> None:
        self._database: Database = database

    async def search(
        self,
        *,
        page: int,
        page_size: int,
        name_query: str | None = None,
        order_by: str | None = None,
        order_dir: str | None = None,
        min_articles: int = 1,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return a paginated author listing optionally filtered by name.

        Joins the materialised per-author totals from
        ``view_author_profile`` so each row carries ``total_articles``,
        ``earliest_year`` and ``latest_year``. Authors with fewer than
        ``min_articles`` contributions are filtered out (default 1, so
        silent authors with no publications stay hidden unless the
        caller passes ``min_articles=0``).
        """
        conditions: list[str] = ["author.total_articles >= %s"]
        parameters: list[Any] = [min_articles]
        if name_query:
            conditions.append("author.author_name LIKE %s")
            parameters.append(f"%{name_query}%")
        where_clause = "WHERE " + " AND ".join(conditions)

        count_query = (
            "SELECT COUNT(*) AS total "
            "FROM materialized_author_profile AS author "
            f"{where_clause}"
        )
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            AUTHOR_LIST_ORDER_COLUMNS,
            "total_articles DESC, author_name ASC",
        )
        list_query = (
            "SELECT author_id, author_name, total_articles, "
            "earliest_year, latest_year "
            "FROM materialized_author_profile AS author "
            f"{where_clause} "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items

    async def fetch_profile(self, author_id: int) -> dict[str, Any] | None:
        """Return the author's aggregated profile, or None if missing.

        Inlines the aggregation rather than reading view_author_profile so
        the author_id predicate is pushed inside both UNION arms; with the
        bridge_*_author_authors indexes that turns 17 seconds of full
        derived-table materialisation into a millisecond index lookup.
        """
        query = (
            "SELECT "
            "    author.author_id, "
            "    author.author_name, "
            "    COALESCE(SUM(contributions.article_count), 0) AS total_articles, "
            "    MIN(contributions.min_year)                   AS earliest_year, "
            "    MAX(contributions.max_year)                   AS latest_year, "
            "    ROUND( "
            "        COALESCE(SUM(contributions.article_count), 0) / "
            "        NULLIF(MAX(contributions.max_year) - MIN(contributions.min_year) + 1, 0), "
            "        2 "
            "    )                                              AS average_articles_per_year "
            "FROM lookup_authors AS author "
            "LEFT JOIN ( "
            "    SELECT bridge.author_id, "
            "           COUNT(*)         AS article_count, "
            "           MIN(article.year) AS min_year, "
            "           MAX(article.year) AS max_year "
            "    FROM bridge_journal_article_authors AS bridge "
            "    JOIN fact_journal_articles AS article "
            "        ON article.article_id = bridge.article_id "
            "    WHERE bridge.author_id = %s "
            "    GROUP BY bridge.author_id "
            "    UNION ALL "
            "    SELECT bridge.author_id, "
            "           COUNT(*)         AS article_count, "
            "           MIN(article.year) AS min_year, "
            "           MAX(article.year) AS max_year "
            "    FROM bridge_conference_article_authors AS bridge "
            "    JOIN fact_conference_articles AS article "
            "        ON article.article_id = bridge.article_id "
            "    WHERE bridge.author_id = %s "
            "    GROUP BY bridge.author_id "
            ") AS contributions ON contributions.author_id = author.author_id "
            "WHERE author.author_id = %s "
            "GROUP BY author.author_id, author.author_name"
        )
        return await self._database.fetch_one(query, (author_id, author_id, author_id))

    async def fetch_yearly_statistics(
        self,
        author_id: int,
        *,
        include_partial_last_year: bool = False,
    ) -> list[dict[str, Any]]:
        """Return per-year article counts for an author.

        Trims the trailing partial year by default; pass
        ``include_partial_last_year=True`` for the raw row.
        """
        query = (
            "SELECT year, articles_count "
            "FROM view_author_yearly_statistics "
            "WHERE author_id = %s "
            "ORDER BY year"
        )
        rows = await self._database.fetch_all(query, (author_id,))
        if include_partial_last_year:
            return rows
        return trim_partial_last_year(rows, "articles_count")

    async def list_articles(
        self,
        author_id: int,
        *,
        page: int,
        page_size: int,
        start_year: int | None = None,
        end_year: int | None = None,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return a paginated list of all articles authored, journal + conf."""
        union_subquery = (
            "SELECT article.article_id, article.title, article.year, "
            "'journal' AS venue_type, "
            "COALESCE(journal.journal_id, 0) AS venue_id, "
            "COALESCE(journal.title, 'Unmatched journal') AS venue_title "
            "FROM bridge_journal_article_authors AS bridge "
            "JOIN fact_journal_articles AS article "
            "ON article.article_id = bridge.article_id "
            "LEFT JOIN lookup_journals AS journal "
            "ON journal.journal_id = article.journal_id "
            "WHERE bridge.author_id = %s "
            "UNION ALL "
            "SELECT article.article_id, article.title, article.year, "
            "'conference' AS venue_type, "
            "COALESCE(conference.conference_id, 0) AS venue_id, "
            "COALESCE(conference.title, 'Unmatched conference') AS venue_title "
            "FROM bridge_conference_article_authors AS bridge "
            "JOIN fact_conference_articles AS article "
            "ON article.article_id = bridge.article_id "
            "LEFT JOIN lookup_conferences AS conference "
            "ON conference.conference_id = article.conference_id "
            "WHERE bridge.author_id = %s"
        )

        conditions: list[str] = []
        parameters: list[Any] = [author_id, author_id]
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        count_query = (
            f"SELECT COUNT(*) AS total FROM ({union_subquery}) AS contributions "
            f"{where_clause}"
        )
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            AUTHOR_ARTICLE_ORDER_COLUMNS,
            "year DESC, article_id",
        )
        list_query = (
            f"SELECT * FROM ({union_subquery}) AS contributions {where_clause} "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items
