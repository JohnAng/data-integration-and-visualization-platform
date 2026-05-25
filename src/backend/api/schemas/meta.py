"""Pydantic response schemas for meta-information endpoints."""

from pydantic import BaseModel


class CorpusTotalsResponse(BaseModel):
    """Top-line counts for the entire integrated dataset.

    The eight values come from the single-row ``view_corpus_totals`` view
    and feed the headline KPI tiles on the landing and dashboard pages.
    ``earliest_year`` and ``latest_year`` describe the temporal span of
    articles whose year is known and non-null.
    """

    total_articles: int
    total_journal_articles: int
    total_conference_articles: int
    total_authors: int
    total_journals: int
    total_conferences: int
    earliest_year: int | None = None
    latest_year: int | None = None


class PublisherOption(BaseModel):
    """One publisher with the count of journals it owns."""

    name: str
    journal_count: int


class FieldOfResearchOption(BaseModel):
    """One FoR code with its human-readable description."""

    code: str
    description: str | None = None


class FilterOptionsResponse(BaseModel):
    """Distinct values feeding every dropdown in the playground sidebar."""

    subject_areas: list[str]
    publishers: list[PublisherOption]
    fields_of_research: list[FieldOfResearchOption]
    conference_ranks: list[str]
