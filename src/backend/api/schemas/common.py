"""Generic schemas shared across resource modules."""

from pydantic import BaseModel, Field

MAXIMUM_PAGE_SIZE: int = 200
DEFAULT_PAGE_SIZE: int = 50
RESULT_HARD_CAP: int = 10_000


class PaginatedResponse[ItemType](BaseModel):
    """
    Standard envelope returned by every paginated list endpoint.

    The hard cap on total returned rows is enforced at the DAO layer so
    callers cannot accidentally trigger an unbounded scan. Larger result
    sets must use the dedicated CSV export endpoint instead.
    """

    items: list[ItemType]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=MAXIMUM_PAGE_SIZE)
    total_items: int = Field(ge=0)
