"""HTTP endpoints for author resources."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from api.data_access.author import AuthorDataAccess
from api.database import Database
from api.dependencies import get_database
from api.schemas.author import (
    AuthorArticle,
    AuthorProfile,
    AuthorSummary,
    AuthorYearlyStatistic,
)
from api.schemas.common import DEFAULT_PAGE_SIZE, MAXIMUM_PAGE_SIZE, PaginatedResponse

router = APIRouter(prefix="/api/authors", tags=["authors"])

DatabaseDependency = Annotated[Database, Depends(get_database)]


@router.get("", response_model=PaginatedResponse[AuthorSummary])
async def search_authors(
    database: DatabaseDependency,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    name_query: str | None = Query(None, min_length=1),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
    min_articles: int = Query(1, ge=0),
) -> PaginatedResponse[AuthorSummary]:
    """Return a paginated author listing, optionally filtered by name substring.

    By default, only authors with at least one indexed contribution are
    returned. Pass ``min_articles=0`` to include silent authors (i.e.
    names present in ``lookup_authors`` but never matched to any article).

    Sortable columns: ``author_name``, ``author_id``, ``total_articles``,
    ``earliest_year``, ``latest_year``.
    """
    rows, total_items = await AuthorDataAccess(database).search(
        page=page,
        page_size=page_size,
        name_query=name_query,
        order_by=order_by,
        order_dir=order_dir,
        min_articles=min_articles,
    )
    return PaginatedResponse[AuthorSummary](
        items=[AuthorSummary.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )


@router.get("/{author_id}", response_model=AuthorProfile)
async def get_author_profile(
    database: DatabaseDependency,
    author_id: int = Path(..., ge=1),
) -> AuthorProfile:
    """Return the aggregated profile of one author."""
    row = await AuthorDataAccess(database).fetch_profile(author_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Author {author_id} not found")
    return AuthorProfile.model_validate(row)


@router.get(
    "/{author_id}/yearly-statistics",
    response_model=list[AuthorYearlyStatistic],
)
async def get_author_yearly_statistics(
    database: DatabaseDependency,
    author_id: int = Path(..., ge=1),
    include_partial_last_year: bool = Query(False),
) -> list[AuthorYearlyStatistic]:
    """Return the per-year article counts for the author's line chart.

    Trims a trailing partial year by default.
    """
    rows = await AuthorDataAccess(database).fetch_yearly_statistics(
        author_id,
        include_partial_last_year=include_partial_last_year,
    )
    return [AuthorYearlyStatistic.model_validate(row) for row in rows]


@router.get(
    "/{author_id}/articles",
    response_model=PaginatedResponse[AuthorArticle],
)
async def list_author_articles(
    database: DatabaseDependency,
    author_id: int = Path(..., ge=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAXIMUM_PAGE_SIZE),
    start_year: int | None = Query(None, ge=1900, le=2100),
    end_year: int | None = Query(None, ge=1900, le=2100),
    order_by: str | None = Query(None),
    order_dir: str | None = Query(None, pattern=r"^(asc|desc)$"),
) -> PaginatedResponse[AuthorArticle]:
    """Return a paginated list of every article the author has co-authored.

    Sortable columns: ``title``, ``year``, ``venue_title``, ``venue_type``.
    """
    rows, total_items = await AuthorDataAccess(database).list_articles(
        author_id,
        page=page,
        page_size=page_size,
        start_year=start_year,
        end_year=end_year,
        order_by=order_by,
        order_dir=order_dir,
    )
    return PaginatedResponse[AuthorArticle](
        items=[AuthorArticle.model_validate(row) for row in rows],
        page=page,
        page_size=page_size,
        total_items=total_items,
    )
