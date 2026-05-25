"""HTTP endpoints for meta-information about the corpus."""

from typing import Annotated

from fastapi import APIRouter, Depends

from api.data_access.meta import MetaDataAccess
from api.database import Database
from api.dependencies import get_database
from api.schemas.meta import CorpusTotalsResponse, FilterOptionsResponse

router = APIRouter(prefix="/api/meta", tags=["meta"])

DatabaseDependency = Annotated[Database, Depends(get_database)]


@router.get("/totals", response_model=CorpusTotalsResponse)
async def get_corpus_totals(database: DatabaseDependency) -> CorpusTotalsResponse:
    """Return headline counts and year span for the entire corpus."""
    row = await MetaDataAccess(database).fetch_totals()
    return CorpusTotalsResponse.model_validate(row)


@router.get("/options", response_model=FilterOptionsResponse)
async def get_filter_options(database: DatabaseDependency) -> FilterOptionsResponse:
    """Return the distinct values feeding every dropdown in the playground.

    Subject areas, publishers (with journal counts), Field of Research
    codes (with human descriptions) and conference ranks. Results are
    sorted in a sensible reading order so the client can use them
    directly without re-sorting.
    """
    payload = await MetaDataAccess(database).fetch_filter_options()
    return FilterOptionsResponse.model_validate(payload)
