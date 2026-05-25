"""Data access for the dedicated chart endpoints."""

from collections import defaultdict
from typing import Any, Literal

from api.database import Database
from api.sql_helpers import trim_partial_last_year


Granularity = Literal["year", "five_year", "decade"]


def _trim_partial_per_group(
    rows: list[dict[str, Any]],
    group_key: str,
    count_key: str,
) -> list[dict[str, Any]]:
    """Trim a partial last year independently for each group within rows.

    Many chart endpoints return rows grouped by series (subject area,
    Field of Research, venue id, ...). The partial-year heuristic must
    therefore run per group rather than across the whole result, since
    different groups may have different terminal years.
    """
    by_group: dict[Any, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_group[row[group_key]].append(row)
    output: list[dict[str, Any]] = []
    for group_rows in by_group.values():
        output.extend(trim_partial_last_year(group_rows, count_key))
    return output


def _bucket_year(year: int, granularity: Granularity) -> int:
    """Bucket a year into the requested granularity.

    Returns the lower bound of the bucket as a representative year. For
    five-year buckets that means 2018 → 2015, 2024 → 2020. For decade
    buckets 2018 → 2010, 2024 → 2020.
    """
    if granularity == "five_year":
        return (year // 5) * 5
    if granularity == "decade":
        return (year // 10) * 10
    return year


def _aggregate_by_bucket(
    rows: list[dict[str, Any]],
    group_key: str,
    year_key: str,
    granularity: Granularity,
    sum_keys: list[str],
) -> list[dict[str, Any]]:
    """Re-aggregate per-year rows into wider buckets.

    Sums every column listed in ``sum_keys`` across rows that fall into
    the same (group, bucket) pair. Year-only granularity returns the
    input unchanged so the hot path stays cheap.
    """
    if granularity == "year":
        return rows
    bucketed: dict[tuple[Any, int], dict[str, Any]] = {}
    for row in rows:
        bucket = _bucket_year(int(row[year_key]), granularity)
        key = (row[group_key], bucket)
        existing = bucketed.get(key)
        if existing is None:
            new_row = dict(row)
            new_row[year_key] = bucket
            bucketed[key] = new_row
        else:
            for column in sum_keys:
                existing[column] = (existing.get(column) or 0) + (
                    row.get(column) or 0
                )
    return sorted(
        bucketed.values(),
        key=lambda entry: (entry[group_key], entry[year_key]),
    )


class ChartDataAccess:
    """Pre-built aggregations that feed the chart components on the UI."""

    def __init__(self, database: Database) -> None:
        self._database: Database = database

    async def publisher_quartile_distribution(self) -> list[dict[str, Any]]:
        """Return publisher x quartile journal counts for the bar chart."""
        query = (
            "SELECT publisher, best_quartile, journal_count "
            "FROM view_publisher_quartile_distribution "
            "ORDER BY publisher, best_quartile"
        )
        return await self._database.fetch_all(query)

    async def subject_area_yearly_summary(
        self,
        *,
        subject_areas: list[str] | None = None,
        start_year: int | None = None,
        end_year: int | None = None,
        granularity: Granularity = "year",
        include_partial_last_year: bool = False,
    ) -> list[dict[str, Any]]:
        """Return per-bucket journal counts by best subject area.

        ``subject_areas`` restricts the result to the supplied list of
        names; pass None or an empty list to receive every subject area.
        ``granularity`` controls the X-axis bucketing — values are
        summed across years that fall into the same five-year or decade
        bucket, with the bucket lower bound used as the representative
        year.
        """
        conditions: list[str] = []
        parameters: list[Any] = []
        if subject_areas:
            placeholders = ", ".join(["%s"] * len(subject_areas))
            conditions.append(f"best_subject_area IN ({placeholders})")
            parameters.extend(subject_areas)
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = (
            "SELECT best_subject_area, year, distinct_journals, articles_count "
            f"FROM materialized_subject_area_yearly_summary {where_clause} "
            "ORDER BY best_subject_area, year"
        )
        rows = await self._database.fetch_all(query, tuple(parameters))
        if not include_partial_last_year:
            rows = _trim_partial_per_group(
                rows, "best_subject_area", "articles_count",
            )
        return _aggregate_by_bucket(
            rows,
            "best_subject_area",
            "year",
            granularity,
            ["articles_count", "distinct_journals"],
        )

    async def field_of_research_yearly_summary(
        self,
        *,
        primary_fors: list[str] | None = None,
        start_year: int | None = None,
        end_year: int | None = None,
        granularity: Granularity = "year",
        include_partial_last_year: bool = False,
    ) -> list[dict[str, Any]]:
        """Return per-bucket conference counts by Field of Research.

        Behaviour mirrors :meth:`subject_area_yearly_summary` — multi
        select via ``primary_fors``, granular bucketing via
        ``granularity``.
        """
        conditions: list[str] = []
        parameters: list[Any] = []
        if primary_fors:
            placeholders = ", ".join(["%s"] * len(primary_fors))
            conditions.append(f"primary_for IN ({placeholders})")
            parameters.extend(primary_fors)
        if start_year is not None:
            conditions.append("year >= %s")
            parameters.append(start_year)
        if end_year is not None:
            conditions.append("year <= %s")
            parameters.append(end_year)
        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = (
            "SELECT primary_for, primary_for_description, year, "
            "distinct_conferences, articles_count "
            f"FROM materialized_field_of_research_yearly_summary {where_clause} "
            "ORDER BY primary_for, year"
        )
        rows = await self._database.fetch_all(query, tuple(parameters))
        if not include_partial_last_year:
            rows = _trim_partial_per_group(rows, "primary_for", "articles_count")
        return _aggregate_by_bucket(
            rows,
            "primary_for",
            "year",
            granularity,
            ["articles_count", "distinct_conferences"],
        )

    async def venue_comparison_yearly(
        self,
        *,
        venue_type: str,
        venue_ids: list[int],
        start_year: int | None = None,
        end_year: int | None = None,
        granularity: Granularity = "year",
    ) -> list[dict[str, Any]]:
        """Return per-bucket statistics for each selected venue.

        ``granularity`` controls X-axis bucketing the same way as the
        subject area and Field of Research summaries.
        """
        if not venue_ids:
            return []
        placeholders = ", ".join(["%s"] * len(venue_ids))

        if venue_type == "journal":
            query = (
                "SELECT statistics.journal_id AS venue_id, "
                "journal.title AS venue_title, statistics.year, "
                "statistics.articles_count, statistics.distinct_authors, "
                "statistics.total_authors "
                "FROM view_journal_yearly_statistics AS statistics "
                "JOIN lookup_journals AS journal "
                "ON journal.journal_id = statistics.journal_id "
                f"WHERE statistics.journal_id IN ({placeholders})"
            )
        elif venue_type == "conference":
            query = (
                "SELECT statistics.conference_id AS venue_id, "
                "conference.title AS venue_title, statistics.year, "
                "statistics.articles_count, statistics.distinct_authors, "
                "statistics.total_authors "
                "FROM view_conference_yearly_statistics AS statistics "
                "JOIN lookup_conferences AS conference "
                "ON conference.conference_id = statistics.conference_id "
                f"WHERE statistics.conference_id IN ({placeholders})"
            )
        else:
            raise ValueError(f"venue_type must be 'journal' or 'conference', got {venue_type!r}")

        parameters: list[Any] = list(venue_ids)
        if start_year is not None:
            query += " AND statistics.year >= %s"
            parameters.append(start_year)
        if end_year is not None:
            query += " AND statistics.year <= %s"
            parameters.append(end_year)
        query += " ORDER BY venue_title, statistics.year"
        rows = await self._database.fetch_all(query, tuple(parameters))
        rows = _trim_partial_per_group(rows, "venue_id", "articles_count")
        return _aggregate_by_bucket(
            rows,
            "venue_id",
            "year",
            granularity,
            ["articles_count", "distinct_authors", "total_authors"],
        )

    async def venue_metrics_bar(
        self,
        *,
        venue_type: str,
        venue_ids: list[int],
    ) -> list[dict[str, Any]]:
        """Return aggregate metrics per venue for the comparison bar chart."""
        if not venue_ids:
            return []
        placeholders = ", ".join(["%s"] * len(venue_ids))

        if venue_type == "journal":
            query = (
                "SELECT profile.journal_id AS venue_id, profile.title AS venue_title, "
                "profile.total_articles, profile.average_articles_per_year, "
                "yearly_aggregate.average_distinct_authors_per_year "
                "FROM view_journal_profile AS profile "
                "LEFT JOIN ("
                "    SELECT journal_id, AVG(distinct_authors) AS average_distinct_authors_per_year "
                "    FROM view_journal_yearly_statistics "
                "    GROUP BY journal_id"
                ") AS yearly_aggregate "
                "ON yearly_aggregate.journal_id = profile.journal_id "
                f"WHERE profile.journal_id IN ({placeholders}) "
                "ORDER BY profile.title"
            )
        elif venue_type == "conference":
            query = (
                "SELECT profile.conference_id AS venue_id, profile.title AS venue_title, "
                "profile.total_articles, profile.average_articles_per_year, "
                "yearly_aggregate.average_distinct_authors_per_year "
                "FROM view_conference_profile AS profile "
                "LEFT JOIN ("
                "    SELECT conference_id, AVG(distinct_authors) AS average_distinct_authors_per_year "
                "    FROM view_conference_yearly_statistics "
                "    GROUP BY conference_id"
                ") AS yearly_aggregate "
                "ON yearly_aggregate.conference_id = profile.conference_id "
                f"WHERE profile.conference_id IN ({placeholders}) "
                "ORDER BY profile.title"
            )
        else:
            raise ValueError(f"venue_type must be 'journal' or 'conference', got {venue_type!r}")
        return await self._database.fetch_all(query, tuple(venue_ids))

    async def authors_vs_articles_scatter(
        self,
        *,
        venue_type: str,
        maximum_points: int = 5000,
        minimum_articles: int = 0,
        rank_or_quartile: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return one scatter point per venue with optional filtering.

        ``minimum_articles`` drops sparse venues so the plot does not get
        overwhelmed by long-tail noise. ``rank_or_quartile`` restricts to
        a single ranking band (e.g. ``Q1`` or ``A*``).
        """
        table = (
            "materialized_authors_vs_articles_scatter_journals"
            if venue_type == "journal"
            else "materialized_authors_vs_articles_scatter_conferences"
        )
        if venue_type not in ("journal", "conference"):
            raise ValueError(
                f"venue_type must be 'journal' or 'conference', got {venue_type!r}"
            )
        conditions: list[str] = ["total_articles >= %s"]
        parameters: list[Any] = [minimum_articles]
        if rank_or_quartile is not None:
            conditions.append("rank_or_quartile = %s")
            parameters.append(rank_or_quartile)
        where_clause = "WHERE " + " AND ".join(conditions)
        query = (
            "SELECT venue_id, venue_title, rank_or_quartile, "
            "average_articles_per_year, average_authors_per_article_overall, "
            "total_articles "
            f"FROM {table} "
            f"{where_clause} "
            "ORDER BY total_articles DESC "
            "LIMIT %s"
        )
        return await self._database.fetch_all(
            query, tuple(parameters) + (maximum_points,),
        )

    async def journal_metrics_for_scatter(
        self,
        *,
        best_subject_area: str | None = None,
        best_quartile: str | None = None,
        publisher: str | None = None,
        maximum_points: int = 5000,
    ) -> list[dict[str, Any]]:
        """Return numeric metrics for each journal so the UI can scatter-plot them.

        ``publisher`` accepts a substring; matching is case-insensitive so
        analysts can type "elsevier" or "Else" interchangeably.
        """
        conditions: list[str] = []
        parameters: list[Any] = []
        if best_subject_area is not None:
            conditions.append("best_subject_area LIKE %s")
            parameters.append(f"%{best_subject_area}%")
        if best_quartile is not None:
            conditions.append("best_quartile = %s")
            parameters.append(best_quartile)
        if publisher is not None:
            conditions.append("publisher LIKE %s")
            parameters.append(f"%{publisher}%")
        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = (
            "SELECT journal_id, title, publisher, best_quartile, best_subject_area, "
            "total_documents, total_documents_3y, total_references, "
            "total_citations_3y, citable_documents_3y, citations_per_document_2y, "
            "references_per_document, sjr_index, citation_score, h_index "
            f"FROM lookup_journals {where_clause} "
            "ORDER BY title "
            "LIMIT %s"
        )
        return await self._database.fetch_all(query, tuple(parameters) + (maximum_points,))
