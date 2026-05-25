"""Data access object for conference resources."""

from typing import Any

from api.database import Database
from api.schemas.common import RESULT_HARD_CAP
from api.sql_helpers import build_order_clause, trim_partial_last_year


CONFERENCE_LIST_ORDER_COLUMNS: dict[str, str] = {
    "title": "conference.title",
    "acronym": "conference.acronym",
    "rank_value": "conference.rank_value",
    "primary_for": "conference.primary_for",
}

CONFERENCE_ARTICLE_ORDER_COLUMNS: dict[str, str] = {
    "title": "title",
    "year": "year",
    "pages": "pages",
}


class ConferenceDataAccess:
    """Reads conference facts and views with raw parameterized SQL."""

    def __init__(self, database: Database) -> None:
        self._database: Database = database

    async def list_summaries(
        self,
        *,
        page: int,
        page_size: int,
        search_text: str | None = None,
        rank_value: str | None = None,
        primary_for: str | None = None,
        ranked_only: bool = False,
        has_acronym: bool = False,
        has_for: bool = False,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return a paginated conference listing and the matching total count.

        ``search_text`` is a substring match against the title and the
        acronym. ``primary_for`` is a substring match too so analysts can
        type "data" instead of remembering the full code.
        ``ranked_only``, ``has_acronym`` and ``has_for`` hide rows
        whose respective field is NULL.

        Sortable columns are constrained to the keys of
        :data:`CONFERENCE_LIST_ORDER_COLUMNS`; anything else falls back
        to the default alphabetical-by-title ordering.
        """
        conditions: list[str] = []
        parameters: list[Any] = []
        if search_text:
            conditions.append("(conference.title LIKE %s OR conference.acronym LIKE %s)")
            parameters.extend([f"%{search_text}%", f"%{search_text}%"])
        if rank_value is not None:
            conditions.append("conference.rank_value = %s")
            parameters.append(rank_value)
        if primary_for is not None:
            conditions.append("conference.primary_for LIKE %s")
            parameters.append(f"%{primary_for}%")
        if ranked_only:
            conditions.append("conference.rank_value IS NOT NULL")
        if has_acronym:
            conditions.append("conference.acronym IS NOT NULL")
        if has_for:
            conditions.append("conference.primary_for IS NOT NULL")

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        count_query = (
            "SELECT COUNT(*) AS total FROM lookup_conferences AS conference "
            f"{where_clause}"
        )
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            CONFERENCE_LIST_ORDER_COLUMNS,
            "conference.title ASC",
        )
        list_query = (
            "SELECT conference.conference_id, conference.title, "
            "conference.acronym, conference.rank_value, conference.primary_for, "
            "field_of_research.description AS primary_for_description "
            "FROM lookup_conferences AS conference "
            "LEFT JOIN lookup_field_of_research_categories AS field_of_research "
            "ON field_of_research.code = conference.primary_for "
            f"{where_clause} "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items

    async def fetch_profile(
        self,
        conference_id: int,
        *,
        start_year: int | None = None,
        end_year: int | None = None,
    ) -> dict[str, Any] | None:
        """
        Return the conference's aggregated profile, optionally year-bounded.

        Without a year range, read the pre-aggregated view. With one,
        recompute every aggregate so the analyst sees stats consistent
        with the active filter.
        """
        if start_year is None and end_year is None:
            query = (
                "SELECT conference_id, title, acronym, rank_value, "
                "primary_for, primary_for_description, total_articles, "
                "earliest_year, latest_year, distinct_authors_total, "
                "average_articles_per_year, average_authors_per_article_overall "
                "FROM view_conference_profile WHERE conference_id = %s"
            )
            return await self._database.fetch_one(query, (conference_id,))

        join_conditions: list[str] = ["article.conference_id = conference.conference_id"]
        join_parameters: list[Any] = []
        if start_year is not None:
            join_conditions.append("article.year >= %s")
            join_parameters.append(start_year)
        if end_year is not None:
            join_conditions.append("article.year <= %s")
            join_parameters.append(end_year)
        join_clause = " AND ".join(join_conditions)

        query = (
            "SELECT conference.conference_id, conference.title, "
            "conference.acronym, conference.rank_value, conference.primary_for, "
            "field_of_research.description AS primary_for_description, "
            "COUNT(DISTINCT article.article_id) AS total_articles, "
            "MIN(article.year) AS earliest_year, MAX(article.year) AS latest_year, "
            "COUNT(DISTINCT bridge.author_id) AS distinct_authors_total, "
            "ROUND(COUNT(DISTINCT article.article_id) / "
            "NULLIF(MAX(article.year) - MIN(article.year) + 1, 0), 2) "
            "AS average_articles_per_year, "
            "ROUND(COUNT(bridge.author_id) / "
            "NULLIF(COUNT(DISTINCT article.article_id), 0), 2) "
            "AS average_authors_per_article_overall "
            "FROM lookup_conferences AS conference "
            f"LEFT JOIN fact_conference_articles AS article ON {join_clause} "
            "LEFT JOIN bridge_conference_article_authors AS bridge "
            "ON bridge.article_id = article.article_id "
            "LEFT JOIN lookup_field_of_research_categories AS field_of_research "
            "ON field_of_research.code = conference.primary_for "
            "WHERE conference.conference_id = %s "
            "GROUP BY conference.conference_id, field_of_research.description"
        )
        parameters = tuple(join_parameters) + (conference_id,)
        return await self._database.fetch_one(query, parameters)

    async def fetch_article_with_authors(self, article_id: int) -> dict[str, Any] | None:
        """Return a single conference article with its full author list."""
        article_query = (
            "SELECT article.article_id, article.title, article.year, "
            "article.pages, article.url, "
            "conference.conference_id AS venue_id, conference.title AS venue_title "
            "FROM fact_conference_articles AS article "
            "JOIN lookup_conferences AS conference "
            "ON conference.conference_id = article.conference_id "
            "WHERE article.article_id = %s"
        )
        article = await self._database.fetch_one(article_query, (article_id,))
        if article is None:
            return None

        authors_query = (
            "SELECT author.author_id, author.author_name "
            "FROM bridge_conference_article_authors AS bridge "
            "JOIN lookup_authors AS author ON author.author_id = bridge.author_id "
            "WHERE bridge.article_id = %s "
            "ORDER BY author.author_name"
        )
        authors = await self._database.fetch_all(authors_query, (article_id,))
        return {**article, "venue_type": "conference", "authors": authors}

    async def fetch_yearly_statistics(
        self,
        conference_id: int,
        *,
        start_year: int | None = None,
        end_year: int | None = None,
        include_partial_last_year: bool = False,
    ) -> list[dict[str, Any]]:
        """Return per-year aggregate statistics within the optional year range.

        Trims a trailing partial year by default (see
        :func:`api.sql_helpers.trim_partial_last_year`).
        """
        conditions: list[str] = ["conference_id = %s"]
        parameters: list[Any] = [conference_id]
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        query = (
            "SELECT year, articles_count, distinct_authors, total_authors, "
            "average_authors_per_article "
            f"FROM view_conference_yearly_statistics WHERE {' AND '.join(conditions)} "
            "ORDER BY year"
        )
        rows = await self._database.fetch_all(query, tuple(parameters))
        if include_partial_last_year:
            return rows
        return trim_partial_last_year(rows, "articles_count")

    async def list_articles(
        self,
        conference_id: int,
        *,
        page: int,
        page_size: int,
        start_year: int | None = None,
        end_year: int | None = None,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return a paginated list of the conference's articles."""
        conditions: list[str] = ["conference_id = %s"]
        parameters: list[Any] = [conference_id]
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        where_clause = "WHERE " + " AND ".join(conditions)

        count_query = (
            "SELECT COUNT(*) AS total "
            f"FROM fact_conference_articles {where_clause}"
        )
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            CONFERENCE_ARTICLE_ORDER_COLUMNS,
            "year DESC, article_id",
        )
        list_query = (
            "SELECT article_id, title, year, pages, url "
            f"FROM fact_conference_articles {where_clause} "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items
