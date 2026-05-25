"""Pydantic response schemas for author-centric endpoints."""

from pydantic import BaseModel


class AuthorSummary(BaseModel):
    """Lightweight projection used by search and list endpoints.

    Includes aggregate counts so the browse table can rank authors by
    output without the caller having to follow a profile link.
    """

    author_id: int
    author_name: str
    total_articles: int = 0
    earliest_year: int | None = None
    latest_year: int | None = None


class AuthorProfile(BaseModel):
    """Full profile aggregating an author's publication record."""

    author_id: int
    author_name: str
    total_articles: int
    earliest_year: int | None = None
    latest_year: int | None = None
    average_articles_per_year: float | None = None


class AuthorYearlyStatistic(BaseModel):
    """One bucket of an author's per-year publication count."""

    year: int
    articles_count: int


class AuthorArticle(BaseModel):
    """Single article authored by the user, regardless of venue type."""

    article_id: int
    title: str
    year: int | None = None
    venue_type: str
    venue_id: int
    venue_title: str