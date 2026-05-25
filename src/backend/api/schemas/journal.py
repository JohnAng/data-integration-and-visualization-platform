"""Pydantic response schemas for journal-centric endpoints."""

from pydantic import BaseModel


class JournalSummary(BaseModel):
    """Lightweight projection used by list endpoints."""

    journal_id: int
    title: str
    publisher: str | None = None
    best_quartile: str | None = None
    best_subject_area: str | None = None
    sjr_index: float | None = None


class JournalProfile(BaseModel):
    """Full profile combining ranking metrics and aggregate statistics."""

    journal_id: int
    title: str
    publisher: str | None = None
    country: str | None = None
    best_quartile: str | None = None
    best_subject_area: str | None = None
    sjr_index: float | None = None
    citation_score: float | None = None
    h_index: int | None = None
    total_documents: int | None = None
    total_documents_3y: int | None = None
    total_references: int | None = None
    total_citations_3y: int | None = None
    citable_documents_3y: int | None = None
    citations_per_document_2y: float | None = None
    references_per_document: float | None = None
    total_articles: int
    earliest_year: int | None = None
    latest_year: int | None = None
    distinct_authors_total: int
    average_articles_per_year: float | None = None
    average_authors_per_article_overall: float | None = None


class JournalYearlyStatistic(BaseModel):
    """One bucket of the journal's per-year aggregate statistics."""

    year: int
    articles_count: int
    distinct_authors: int
    total_authors: int
    average_authors_per_article: float | None = None


class JournalArticle(BaseModel):
    """Single article published in a journal."""

    article_id: int
    title: str
    year: int | None = None
    pages: str | None = None
    url: str | None = None
