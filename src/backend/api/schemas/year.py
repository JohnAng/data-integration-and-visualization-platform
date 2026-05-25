"""Pydantic response schemas for year-centric endpoints."""

from pydantic import BaseModel

from api.schemas.conference import ConferenceSummary
from api.schemas.journal import JournalSummary


class YearSummary(BaseModel):
    """Aggregate counts for a single publication year."""

    year: int
    journal_articles: int
    conference_articles: int
    total_articles: int
    distinct_journals: int
    distinct_conferences: int
    distinct_authors: int
    total_authors: int


class YearJournalEntry(JournalSummary):
    """Journal that published at least one article in the requested year."""

    articles_in_year: int


class YearConferenceEntry(ConferenceSummary):
    """Conference that held at least one paper in the requested year."""

    articles_in_year: int


class YearArticle(BaseModel):
    """Article published in a given year, regardless of venue type."""

    article_id: int
    title: str
    venue_type: str
    venue_id: int
    venue_title: str
    pages: str | None = None
    url: str | None = None
