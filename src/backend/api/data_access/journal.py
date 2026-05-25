"""Data access object for journal resources."""

from typing import Any

from api.database import Database
from api.schemas.common import RESULT_HARD_CAP
from api.sql_helpers import build_order_clause, trim_partial_last_year


JOURNAL_LIST_ORDER_COLUMNS: dict[str, str] = {
    "title": "title",
    "publisher": "publisher",
    "best_quartile": "best_quartile",
    "best_subject_area": "best_subject_area",
    "sjr_index": "sjr_index",
}

JOURNAL_ARTICLE_ORDER_COLUMNS: dict[str, str] = {
    "title": "title",
    "year": "year",
    "pages": "pages",
}


class JournalDataAccess:
    """Reads journal facts and views with raw parameterized SQL."""

    def __init__(self, database: Database) -> None:
        self._database: Database = database

    async def list_summaries(
        self,
        *,
        page: int,
        page_size: int,
        search_text: str | None = None,
        publisher: str | None = None,
        best_quartile: str | None = None,
        best_subject_area: str | None = None,
        ranked_only: bool = False,
        has_publisher: bool = False,
        has_subject_area: bool = False,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return a paginated journal listing and the matching total count.

        ``search_text`` is a substring match against the title.
        ``publisher`` and ``best_subject_area`` are substring matches too,
        so analysts do not need to type the full exact value.
        ``has_publisher`` and ``has_subject_area`` filter out rows whose
        respective field is NULL; ``ranked_only`` does the same for the
        quartile column.

        The caller may request a sort via ``order_by`` (one of the keys
        in :data:`JOURNAL_LIST_ORDER_COLUMNS`) and ``order_dir``
        (``asc`` or ``desc``).
        """
        conditions: list[str] = []
        parameters: list[Any] = []
        if search_text:
            conditions.append("title LIKE %s")
            parameters.append(f"%{search_text}%")
        if publisher is not None:
            conditions.append("publisher LIKE %s")
            parameters.append(f"%{publisher}%")
        if best_quartile is not None:
            conditions.append("best_quartile = %s")
            parameters.append(best_quartile)
        if best_subject_area is not None:
            conditions.append("best_subject_area LIKE %s")
            parameters.append(f"%{best_subject_area}%")
        if ranked_only:
            conditions.append("best_quartile IS NOT NULL")
        if has_publisher:
            conditions.append("publisher IS NOT NULL")
        if has_subject_area:
            conditions.append("best_subject_area IS NOT NULL")

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        count_query = f"SELECT COUNT(*) AS total FROM lookup_journals {where_clause}"
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            JOURNAL_LIST_ORDER_COLUMNS,
            "title ASC",
        )
        list_query = (
            "SELECT journal_id, title, publisher, best_quartile, "
            "best_subject_area, sjr_index "
            f"FROM lookup_journals {where_clause} "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items

    async def fetch_profile(
        self,
        journal_id: int,
        *,
        start_year: int | None = None,
        end_year: int | None = None,
    ) -> dict[str, Any] | None:
        """
        Return the journal's aggregated profile.

        If no year range is supplied, read the pre-aggregated
        view_journal_profile. If a range is supplied, recompute every
        aggregate on the fly so the analyst sees stats that match the
        active year filter.
        """
        if start_year is None and end_year is None:
            query = "SELECT * FROM view_journal_profile WHERE journal_id = %s"
            return await self._database.fetch_one(query, (journal_id,))

        join_conditions: list[str] = ["article.journal_id = journal.journal_id"]
        join_parameters: list[Any] = []
        if start_year is not None:
            join_conditions.append("article.year >= %s")
            join_parameters.append(start_year)
        if end_year is not None:
            join_conditions.append("article.year <= %s")
            join_parameters.append(end_year)
        join_clause = " AND ".join(join_conditions)

        query = (
            "SELECT journal.journal_id, journal.title, journal.publisher, "
            "journal.country, journal.best_quartile, journal.best_subject_area, "
            "journal.sjr_index, journal.citation_score, journal.h_index, "
            "journal.total_documents, journal.total_documents_3y, journal.total_references, "
            "journal.total_citations_3y, journal.citable_documents_3y, "
            "journal.citations_per_document_2y, journal.references_per_document, "
            "COUNT(DISTINCT article.article_id) AS total_articles, "
            "MIN(article.year) AS earliest_year, MAX(article.year) AS latest_year, "
            "COUNT(DISTINCT bridge.author_id) AS distinct_authors_total, "
            "ROUND(COUNT(DISTINCT article.article_id) / "
            "NULLIF(MAX(article.year) - MIN(article.year) + 1, 0), 2) "
            "AS average_articles_per_year, "
            "ROUND(COUNT(bridge.author_id) / "
            "NULLIF(COUNT(DISTINCT article.article_id), 0), 2) "
            "AS average_authors_per_article_overall "
            "FROM lookup_journals AS journal "
            f"LEFT JOIN fact_journal_articles AS article ON {join_clause} "
            "LEFT JOIN bridge_journal_article_authors AS bridge "
            "ON bridge.article_id = article.article_id "
            "WHERE journal.journal_id = %s "
            "GROUP BY journal.journal_id"
        )
        parameters = tuple(join_parameters) + (journal_id,)
        return await self._database.fetch_one(query, parameters)

    async def fetch_article_with_authors(self, article_id: int) -> dict[str, Any] | None:
        """Return a single journal article with its full author list."""
        article_query = (
            "SELECT article.article_id, article.title, article.year, "
            "article.pages, article.url, "
            "journal.journal_id AS venue_id, journal.title AS venue_title "
            "FROM fact_journal_articles AS article "
            "JOIN lookup_journals AS journal "
            "ON journal.journal_id = article.journal_id "
            "WHERE article.article_id = %s"
        )
        article = await self._database.fetch_one(article_query, (article_id,))
        if article is None:
            return None

        authors_query = (
            "SELECT author.author_id, author.author_name "
            "FROM bridge_journal_article_authors AS bridge "
            "JOIN lookup_authors AS author ON author.author_id = bridge.author_id "
            "WHERE bridge.article_id = %s "
            "ORDER BY author.author_name"
        )
        authors = await self._database.fetch_all(authors_query, (article_id,))
        return {**article, "venue_type": "journal", "authors": authors}

    async def fetch_yearly_statistics(
        self,
        journal_id: int,
        *,
        start_year: int | None = None,
        end_year: int | None = None,
        include_partial_last_year: bool = False,
    ) -> list[dict[str, Any]]:
        """Return per-year aggregate statistics within the optional year range.

        Trims the trailing year automatically when its article count
        falls below half of the previous year's, which matches the
        partial-year pattern DBLP exports tend to produce. Callers that
        want the raw row (e.g. for auditing) can pass
        ``include_partial_last_year=True``.
        """
        conditions: list[str] = ["journal_id = %s"]
        parameters: list[Any] = [journal_id]
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        query = (
            "SELECT year, articles_count, distinct_authors, total_authors, "
            "average_authors_per_article "
            f"FROM view_journal_yearly_statistics WHERE {' AND '.join(conditions)} "
            "ORDER BY year"
        )
        rows = await self._database.fetch_all(query, tuple(parameters))
        if include_partial_last_year:
            return rows
        return trim_partial_last_year(rows, "articles_count")

    async def list_articles(
        self,
        journal_id: int,
        *,
        page: int,
        page_size: int,
        start_year: int | None = None,
        end_year: int | None = None,
        order_by: str | None = None,
        order_dir: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Return a paginated list of the journal's articles."""
        conditions: list[str] = ["journal_id = %s"]
        parameters: list[Any] = [journal_id]
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        where_clause = "WHERE " + " AND ".join(conditions)

        count_query = f"SELECT COUNT(*) AS total FROM fact_journal_articles {where_clause}"
        count_row = await self._database.fetch_one(count_query, tuple(parameters))
        total_items = int(count_row["total"]) if count_row else 0

        order_clause = build_order_clause(
            order_by,
            order_dir,
            JOURNAL_ARTICLE_ORDER_COLUMNS,
            "year DESC, article_id",
        )
        list_query = (
            "SELECT article_id, title, year, pages, url "
            f"FROM fact_journal_articles {where_clause} "
            f"{order_clause} "
            "LIMIT %s OFFSET %s"
        )
        offset = (page - 1) * page_size
        list_parameters = tuple(parameters) + (min(page_size, RESULT_HARD_CAP), offset)
        rows = await self._database.fetch_all(list_query, list_parameters)
        return rows, total_items
