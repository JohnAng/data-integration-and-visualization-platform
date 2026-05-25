"""HTTP endpoints for conference resources."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from api.data_access.conference import ConferenceDataAccess
from api.database import Database
from api.dependencies import get_database
from api.schemas.common import DEFAULT_PAGE_SIZE, MAXIMUM_PAGE_SIZE, PaginatedResponse
from api.schemas.conference import (
    ConferenceArticle,
    ConferenceProfile,
    ConferenceSummary,
    ConferenceYearlyStatistic,
)
from api.schemas.paper import PaperDetails

router = APIRouter(prefix="/api/conferences", tags=["conferences"])

DatabaseDependency = Annotated[Database, Depends(get_database)]


@router.get("", response_model=PaginatedResponse[ConferenceSummary])
async def list_conferences(
    database: DatabaseDependency,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    search_text: str | None = Query(None, min_length=1),
    rank_value: str | None = Query(None),
    primary_for: str | None = Query(None, min_length=1),
    ranked_only: bool = Query(False),
    has_acronym: bool = Query(False),
    has_for: bool = Query(False),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[ConferenceSummary]:
    """Return a paginated list of conferences, optionally filtered.

    ``search_text`` is a substring match against both title and acronym.
    ``primary_for`` is a substring match. ``ranked_only`` hides rows
    without an iCore rank; ``has_acronym`` hides rows without an
    acronym; ``has_for`` hides rows without a Field of Research code.
    Sortable columns: ``title``, ``acronym``, ``rank_value``,
    ``primary_for``.
    """
    rows, total_items = await ConferenceDataAccess(database).list_summaries(
        page=page,
        page_size=page_size,
        search_text=search_text,
        rank_value=rank_value,
        primary_for=primary_for,
        ranked_only=ranked_only,
        has_acronym=has_acronym,
        has_for=has_for,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[ConferenceSummary](
        items=[ConferenceSummary.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )


@router.get("/{conference_id}", response_model=ConferenceProfile)
async def get_conference_profile(
    database: DatabaseDependency,
    conference_id: int = Path(..., ge=1),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
) -> ConferenceProfile:
    """Return the aggregated profile of one conference, optionally year-bounded."""
    row = await ConferenceDataAccess(database).fetch_profile(
        conference_id,
        start_year=start_year,
        end_year=end_year,
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"Conference {conference_id} not found")
    return ConferenceProfile.model_validate(row)


@router.get(
    "/{conference_id}/articles/{article_id}",
    response_model=PaperDetails,
)
async def get_conference_article_details(
    database: DatabaseDependency,
    conference_id: int = Path(..., ge=1),
    article_id: int = Path(..., ge=1),
) -> PaperDetails:
    """Return full details of one conference paper including its authors."""
    row = await ConferenceDataAccess(database).fetch_article_with_authors(article_id)
    if row is None or row.get("venue_id") != conference_id:
        raise HTTPException(
            status_code=404,
            detail=f"Article {article_id} not found in conference {conference_id}",
        )
    return PaperDetails.model_validate(row)


@router.get(
    "/{conference_id}/yearly-statistics",
    response_model=list[ConferenceYearlyStatistic],
)
async def get_conference_yearly_statistics(
    database: DatabaseDependency,
    conference_id: int = Path(..., ge=1),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    include_partial_last_year: bool = Query(False),
) -> list[ConferenceYearlyStatistic]:
    """Return the per-year publication statistics that drive the line chart.

    Trims a trailing partial year by default.
    """
    rows = await ConferenceDataAccess(database).fetch_yearly_statistics(
        conference_id,
        start_year=start_year,
        end_year=end_year,
        include_partial_last_year=include_partial_last_year,
    )
    return [ConferenceYearlyStatistic.model_validate(row) for row in rows]


@router.get(
    "/{conference_id}/articles",
    response_model=PaginatedResponse[ConferenceArticle],
)
async def list_conference_articles(
    database: DatabaseDependency,
    conference_id: int = Path(..., ge=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[ConferenceArticle]:
    """Return a paginated list of articles presented at the conference.

    Sortable columns: ``title``, ``year``, ``pages``.
    """
    rows, total_items = await ConferenceDataAccess(database).list_articles(
        conference_id,
        page=page,
        page_size=page_size,
        start_year=start_year,
        end_year=end_year,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[ConferenceArticle](
        items=[ConferenceArticle.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )
