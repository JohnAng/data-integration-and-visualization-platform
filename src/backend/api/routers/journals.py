"""HTTP endpoints for journal resources."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from api.data_access.journal import JournalDataAccess
from api.database import Database
from api.dependencies import get_database
from api.schemas.common import DEFAULT_PAGE_SIZE, MAXIMUM_PAGE_SIZE, PaginatedResponse
from api.schemas.journal import (
    JournalArticle,
    JournalProfile,
    JournalSummary,
    JournalYearlyStatistic,
)
from api.schemas.paper import PaperDetails

router = APIRouter(prefix="/api/journals", tags=["journals"])

DatabaseDependency = Annotated[Database, Depends(get_database)]


@router.get("", response_model=PaginatedResponse[JournalSummary])
async def list_journals(
    database: DatabaseDependency,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    search_text: str | None = Query(None, min_length=1),
    publisher: str | None = Query(None, min_length=1),
    best_quartile: str | None = Query(None, pattern=r"^Q[1-4]$"),
    best_subject_area: str | None = Query(None, min_length=1),
    ranked_only: bool = Query(False),
    has_publisher: bool = Query(False),
    has_subject_area: bool = Query(False),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[JournalSummary]:
    """Return a paginated list of journals, optionally filtered.

    All free-text filters (``search_text``, ``publisher``,
    ``best_subject_area``) are case-insensitive substring matches.
    ``ranked_only=true`` hides rows without a quartile;
    ``has_publisher`` and ``has_subject_area`` hide rows whose respective
    column is NULL. Sortable columns: ``title``, ``publisher``,
    ``best_quartile``, ``best_subject_area``, ``sjr_index``.
    """
    rows, total_items = await JournalDataAccess(database).list_summaries(
        page=page,
        page_size=page_size,
        search_text=search_text,
        publisher=publisher,
        best_quartile=best_quartile,
        best_subject_area=best_subject_area,
        ranked_only=ranked_only,
        has_publisher=has_publisher,
        has_subject_area=has_subject_area,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[JournalSummary](
        items=[JournalSummary.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )


@router.get("/{journal_id}", response_model=JournalProfile)
async def get_journal_profile(
    database: DatabaseDependency,
    journal_id: int = Path(..., ge=1),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
) -> JournalProfile:
    """Return the aggregated profile of one journal, optionally year-bounded."""
    row = await JournalDataAccess(database).fetch_profile(
        journal_id,
        start_year=start_year,
        end_year=end_year,
    )
    if row is None:
        raise HTTPException(status_code=404, detail=f"Journal {journal_id} not found")
    return JournalProfile.model_validate(row)


@router.get(
    "/{journal_id}/articles/{article_id}",
    response_model=PaperDetails,
)
async def get_journal_article_details(
    database: DatabaseDependency,
    journal_id: int = Path(..., ge=1),
    article_id: int = Path(..., ge=1),
) -> PaperDetails:
    """Return full details of one journal article including its authors."""
    row = await JournalDataAccess(database).fetch_article_with_authors(article_id)
    if row is None or row.get("venue_id") != journal_id:
        raise HTTPException(
            status_code=404,
            detail=f"Article {article_id} not found in journal {journal_id}",
        )
    return PaperDetails.model_validate(row)


@router.get(
    "/{journal_id}/yearly-statistics",
    response_model=list[JournalYearlyStatistic],
)
async def get_journal_yearly_statistics(
    database: DatabaseDependency,
    journal_id: int = Path(..., ge=1),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    include_partial_last_year: bool = Query(False),
) -> list[JournalYearlyStatistic]:
    """Return the per-year publication statistics that drive the line chart.

    Trims a trailing partial year by default; pass
    ``include_partial_last_year=true`` to receive every row from the
    underlying view.
    """
    rows = await JournalDataAccess(database).fetch_yearly_statistics(
        journal_id,
        start_year=start_year,
        end_year=end_year,
        include_partial_last_year=include_partial_last_year,
    )
    return [JournalYearlyStatistic.model_validate(row) for row in rows]


@router.get(
    "/{journal_id}/articles",
    response_model=PaginatedResponse[JournalArticle],
)
async def list_journal_articles(
    database: DatabaseDependency,
    journal_id: int = Path(..., ge=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[JournalArticle]:
    """Return a paginated list of articles published in the journal.

    Sortable columns: ``title``, ``year``, ``pages``.
    """
    rows, total_items = await JournalDataAccess(database).list_articles(
        journal_id,
        page=page,
        page_size=page_size,
        start_year=start_year,
        end_year=end_year,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[JournalArticle](
        items=[JournalArticle.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )
