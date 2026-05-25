"""HTTP endpoints that feed pre-built data sets to the chart components."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from api.data_access.charts import ChartDataAccess
from api.database import Database
from api.dependencies import get_database
from api.schemas.charts import (
    AuthorsVsArticlesPoint,
    FieldOfResearchYearlyEntry,
    JournalMetricPoint,
    PublisherQuartileEntry,
    SubjectAreaYearlyEntry,
    VenueComparisonPoint,
    VenueMetricsPoint,
)

VENUE_TYPE_PATTERN: str = "^(journal|conference)$"
GRANULARITY_PATTERN: str = "^(year|five_year|decade)$"


router = APIRouter(prefix="/api/charts", tags=["charts"])

DatabaseDependency = Annotated[Database, Depends(get_database)]


@router.get(
    "/publisher-quartile-distribution",
    response_model=list[PublisherQuartileEntry],
)
async def get_publisher_quartile_distribution(
    database: DatabaseDependency,
) -> list[PublisherQuartileEntry]:
    """Return all (publisher, quartile, count) triples for the bar chart."""
    rows = await ChartDataAccess(database).publisher_quartile_distribution()
    return [PublisherQuartileEntry.model_validate(row) for row in rows]


@router.get(
    "/subject-area-yearly-summary",
    response_model=list[SubjectAreaYearlyEntry],
)
async def get_subject_area_yearly_summary(
    database: DatabaseDependency,
    subject_areas: list[str] | None = Query(None),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    granularity: str = Query("year", pattern=GRANULARITY_PATTERN),
    include_partial_last_year: bool = Query(False),
) -> list[SubjectAreaYearlyEntry]:
    """Return per-bucket journal counts per Kaggle BestSubjectArea.

    ``subject_areas`` accepts zero or more area names; omitting the
    parameter returns every area. ``granularity`` buckets the X axis:
    ``year`` (no bucketing), ``five_year`` (2015, 2020…), ``decade``
    (1990, 2000, 2010, 2020…). Trims a trailing partial year per area
    by default.
    """
    rows = await ChartDataAccess(database).subject_area_yearly_summary(
        subject_areas=subject_areas,
        start_year=start_year,
        end_year=end_year,
        granularity=granularity,  # type: ignore[arg-type]
        include_partial_last_year=include_partial_last_year,
    )
    return [SubjectAreaYearlyEntry.model_validate(row) for row in rows]


@router.get(
    "/field-of-research-yearly-summary",
    response_model=list[FieldOfResearchYearlyEntry],
)
async def get_field_of_research_yearly_summary(
    database: DatabaseDependency,
    primary_fors: list[str] | None = Query(None),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    granularity: str = Query("year", pattern=GRANULARITY_PATTERN),
    include_partial_last_year: bool = Query(False),
) -> list[FieldOfResearchYearlyEntry]:
    """Return per-bucket conference counts per iCore Field of Research.

    ``primary_fors`` accepts zero or more codes; omitting the parameter
    returns every code. Granularity behaviour mirrors the subject-area
    summary endpoint.
    """
    rows = await ChartDataAccess(database).field_of_research_yearly_summary(
        primary_fors=primary_fors,
        start_year=start_year,
        end_year=end_year,
        granularity=granularity,  # type: ignore[arg-type]
        include_partial_last_year=include_partial_last_year,
    )
    return [FieldOfResearchYearlyEntry.model_validate(row) for row in rows]


@router.get(
    "/venue-comparison",
    response_model=list[VenueComparisonPoint],
)
async def get_venue_comparison(
    database: DatabaseDependency,
    venue_type: str = Query(..., pattern=VENUE_TYPE_PATTERN),
    venue_ids: list[int] = Query(..., min_length=1, max_length=20),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    granularity: str = Query("year", pattern=GRANULARITY_PATTERN),
) -> list[VenueComparisonPoint]:
    """Return per-bucket article counts for each selected venue."""
    rows = await ChartDataAccess(database).venue_comparison_yearly(
        venue_type=venue_type,
        venue_ids=venue_ids,
        start_year=start_year,
        end_year=end_year,
        granularity=granularity,  # type: ignore[arg-type]
    )
    return [VenueComparisonPoint.model_validate(row) for row in rows]


@router.get(
    "/venue-metrics",
    response_model=list[VenueMetricsPoint],
)
async def get_venue_metrics(
    database: DatabaseDependency,
    venue_type: str = Query(..., pattern=VENUE_TYPE_PATTERN),
    venue_ids: list[int] = Query(..., min_length=1, max_length=20),
) -> list[VenueMetricsPoint]:
    """Return aggregate metrics for each selected venue (bar chart)."""
    rows = await ChartDataAccess(database).venue_metrics_bar(
        venue_type=venue_type,
        venue_ids=venue_ids,
    )
    return [VenueMetricsPoint.model_validate(row) for row in rows]


@router.get(
    "/authors-vs-articles-scatter",
    response_model=list[AuthorsVsArticlesPoint],
)
async def get_authors_vs_articles_scatter(
    database: DatabaseDependency,
    venue_type: str = Query(..., pattern=VENUE_TYPE_PATTERN),
    maximum_points: int = Query(5000, ge=1, le=10_000),
    minimum_articles: int = Query(0, ge=0),
    rank_or_quartile: str | None = Query(None, min_length=1),
) -> list[AuthorsVsArticlesPoint]:
    """Return per-venue scatter points pairing avg articles/yr with avg authors/article.

    Accepts ``minimum_articles`` to discard sparse venues and
    ``rank_or_quartile`` to restrict the plot to a single ranking band.
    """
    rows = await ChartDataAccess(database).authors_vs_articles_scatter(
        venue_type=venue_type,
        maximum_points=maximum_points,
        minimum_articles=minimum_articles,
        rank_or_quartile=rank_or_quartile,
    )
    return [AuthorsVsArticlesPoint.model_validate(row) for row in rows]


@router.get(
    "/journal-metrics",
    response_model=list[JournalMetricPoint],
)
async def get_journal_metrics(
    database: DatabaseDependency,
    best_subject_area: str | None = Query(None, min_length=1),
    best_quartile: str | None = Query(None, pattern=r"^Q[1-4]$"),
    publisher: str | None = Query(None, min_length=1),
    maximum_points: int = Query(5000, ge=1, le=10_000),
) -> list[JournalMetricPoint]:
    """Return one numeric metric tuple per journal for scatter plotting.

    All free-text filters are substring matches; the response includes
    ``publisher``, ``best_quartile`` and ``best_subject_area`` so the UI
    can colour points by any of those categorical dimensions.
    """
    rows = await ChartDataAccess(database).journal_metrics_for_scatter(
        best_subject_area=best_subject_area,
        best_quartile=best_quartile,
        publisher=publisher,
        maximum_points=maximum_points,
    )
    return [JournalMetricPoint.model_validate(row) for row in rows]
