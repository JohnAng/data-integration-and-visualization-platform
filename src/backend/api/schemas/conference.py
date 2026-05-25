"""Pydantic response schemas for conference-centric endpoints."""

from pydantic import BaseModel


class ConferenceSummary(BaseModel):
    """Lightweight projection used by list endpoints."""

    conference_id: int
    title: str
    acronym: str | None = None
    rank_value: str | None = None
    primary_for: str | None = None
    primary_for_description: str | None = None


class ConferenceProfile(BaseModel):
    """Full profile combining iCore ranking columns with aggregate stats."""

    conference_id: int
    title: str
    acronym: str | None = None
    rank_value: str | None = None
    primary_for: str | None = None
    primary_for_description: str | None = None
    total_articles: int
    earliest_year: int | None = None
    latest_year: int | None = None
    distinct_authors_total: int
    average_articles_per_year: float | None = None
    average_authors_per_article_overall: float | None = None


class ConferenceYearlyStatistic(BaseModel):
    """One bucket of the conference's per-year aggregate statistics."""

    year: int
    articles_count: int
    distinct_authors: int
    total_authors: int
    average_authors_per_article: float | None = None


class ConferenceArticle(BaseModel):
    """Single article presented at a conference."""

    article_id: int
    title: str
    year: int | None = None
    pages: str | None = None
    url: str | None = None
