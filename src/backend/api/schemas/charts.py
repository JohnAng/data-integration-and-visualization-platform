"""Pydantic response schemas for the chart endpoints."""

from pydantic import BaseModel


class PublisherQuartileEntry(BaseModel):
    """Row for the publisher bar chart."""

    publisher: str
    best_quartile: str | None = None
    journal_count: int


class SubjectAreaYearlyEntry(BaseModel):
    """Row for the BestSubjectArea line chart."""

    best_subject_area: str
    year: int
    distinct_journals: int
    articles_count: int


class FieldOfResearchYearlyEntry(BaseModel):
    """Row for the Field of Research line chart."""

    primary_for: str
    primary_for_description: str | None = None
    year: int
    distinct_conferences: int
    articles_count: int


class JournalMetricPoint(BaseModel):
    """Single point in the journal-metrics scatter plot."""

    journal_id: int
    title: str
    publisher: str | None = None
    best_quartile: str | None = None
    best_subject_area: str | None = None
    total_documents: int | None = None
    total_documents_3y: int | None = None
    total_references: int | None = None
    total_citations_3y: int | None = None
    citable_documents_3y: int | None = None
    citations_per_document_2y: float | None = None
    references_per_document: float | None = None
    sjr_index: float | None = None
    citation_score: float | None = None
    h_index: int | None = None


class VenueComparisonPoint(BaseModel):
    """Single (venue, year) row inside the multi-venue line chart payload."""

    venue_id: int
    venue_title: str
    year: int
    articles_count: int
    distinct_authors: int
    total_authors: int


class VenueMetricsPoint(BaseModel):
    """Per-venue aggregates feeding the multi-venue bar chart.

    Matches the brief's bar chart spec: total published articles, average
    articles per year, and average distinct authors per year.
    """

    venue_id: int
    venue_title: str
    total_articles: int
    average_articles_per_year: float | None = None
    average_distinct_authors_per_year: float | None = None


class AuthorsVsArticlesPoint(BaseModel):
    """One scatter-plot point per venue, articles per year vs authors per article."""

    venue_id: int
    venue_title: str
    rank_or_quartile: str | None = None
    average_articles_per_year: float | None = None
    average_authors_per_article_overall: float | None = None
    total_articles: int
