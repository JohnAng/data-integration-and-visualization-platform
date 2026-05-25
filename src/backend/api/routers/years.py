"""HTTP endpoints for per-year aggregate resources."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from api.data_access.year import YearDataAccess
from api.database import Database
from api.dependencies import get_database
from api.schemas.common import DEFAULT_PAGE_SIZE, MAXIMUM_PAGE_SIZE, PaginatedResponse
from api.schemas.year import YearArticle, YearConferenceEntry, YearJournalEntry, YearSummary

router = APIRouter(prefix="/api/years", tags=["years"])

DatabaseDependency = Annotated[Database, Depends(get_database)]


@router.get("", response_model=list[YearSummary])
async def list_year_summaries(
    database: DatabaseDependency,
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    include_partial_last_year: bool = Query(False),
) -> list[YearSummary]:
    """Return the year summary timeseries optionally bounded by a range.

    The last year of the corpus is sometimes a partial export (DBLP
    snapshots taken mid-year). It is trimmed by default; pass
    ``include_partial_last_year=true`` to receive every row.
    """
    rows = await YearDataAccess(database).list_summaries(
        start_year=start_year,
        end_year=end_year,
        include_partial_last_year=include_partial_last_year,
    )
    return [YearSummary.model_validate(row) for row in rows]


@router.get("/{year}", response_model=YearSummary)
async def get_year_summary(
    database: DatabaseDependency,
    year: int = Path(..., ge=1900, le=2100),
) -> YearSummary:
    """Return the aggregate summary for one publication year."""
    row = await YearDataAccess(database).fetch_summary(year)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Year {year} has no published articles")
    return YearSummary.model_validate(row)


@router.get("/{year}/journals", response_model=PaginatedResponse[YearJournalEntry])
async def list_year_journals(
    database: DatabaseDependency,
    year: int = Path(..., ge=1900, le=2100),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[YearJournalEntry]:
    """Return journals that published in the requested year.

    Sortable columns: ``title``, ``publisher``, ``best_quartile``,
    ``sjr_index``, ``articles_in_year``.
    """
    rows, total_items = await YearDataAccess(database).list_year_journals(
        year,
        page=page,
        page_size=page_size,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[YearJournalEntry](
        items=[YearJournalEntry.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )


@router.get("/{year}/articles", response_model=PaginatedResponse[YearArticle])
async def list_year_articles(
    database: DatabaseDependency,
    year: int = Path(..., ge=1900, le=2100),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    conference_id: int | None = Query(None, ge=1),
    journal_id: int | None = Query(None, ge=1),
    author_id: int | None = Query(None, ge=1),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[YearArticle]:
    """Return every article published in the year, optionally filtered.

    Sortable columns: ``title``, ``venue_title``, ``venue_type``.
    """
    rows, total_items = await YearDataAccess(database).list_year_articles(
        year,
        page=page,
        page_size=page_size,
        conference_id=conference_id,
        journal_id=journal_id,
        author_id=author_id,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[YearArticle](
        items=[YearArticle.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )


@router.get("/{year}/conferences", response_model=PaginatedResponse[YearConferenceEntry])
async def list_year_conferences(
    database: DatabaseDependency,
    year: int = Path(..., ge=1900, le=2100),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[YearConferenceEntry]:
    """Return conferences that held papers in the requested year.

    Sortable columns: ``title``, ``acronym``, ``rank_value``,
    ``articles_in_year``.
    """
    rows, total_items = await YearDataAccess(database).list_year_conferences(
        year,
        page=page,
        page_size=page_size,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[YearConferenceEntry](
        items=[YearConferenceEntry.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )
