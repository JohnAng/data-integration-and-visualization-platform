"""Pydantic response schemas for individual paper detail views."""

from pydantic import BaseModel


class PaperAuthor(BaseModel):
    """Author entry inside a paper detail response."""

    author_id: int
    author_name: str


class PaperDetails(BaseModel):
    """Full information about a single article including its authors."""

    article_id: int
    title: str
    year: int | None = None
    pages: str | None = None
    url: str | None = None
    venue_type: str
    venue_id: int
    venue_title: str
    authors: list[PaperAuthor]
