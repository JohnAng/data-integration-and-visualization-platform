"""Unit tests for the Pydantic response schemas."""

import pytest
from pydantic import ValidationError

from api.schemas.author import AuthorProfile
from api.schemas.charts import (
    AuthorsVsArticlesPoint,
    PublisherQuartileEntry,
    VenueMetricsPoint,
)
from api.schemas.common import (
    DEFAULT_PAGE_SIZE,
    MAXIMUM_PAGE_SIZE,
    PaginatedResponse,
)
from api.schemas.conference import ConferenceProfile
from api.schemas.journal import JournalProfile, JournalSummary
from api.schemas.paper import PaperAuthor, PaperDetails
from api.schemas.year import YearSummary


class TestPaginatedResponse:
    """The generic envelope returned by every list endpoint."""

    def test_wraps_items_with_metadata(self) -> None:
        response = PaginatedResponse[JournalSummary](
            items=[JournalSummary(journal_id=1, title="Test Journal")],
            page=1,
            page_size=DEFAULT_PAGE_SIZE,
            total_items=1,
        )
        assert response.page == 1
        assert response.total_items == 1
        assert response.items[0].title == "Test Journal"

    def test_rejects_page_below_one(self) -> None:
        with pytest.raises(ValidationError):
            PaginatedResponse[JournalSummary](
                items=[], page=0, page_size=10, total_items=0,
            )

    def test_rejects_page_size_above_maximum(self) -> None:
        with pytest.raises(ValidationError):
            PaginatedResponse[JournalSummary](
                items=[], page=1, page_size=MAXIMUM_PAGE_SIZE + 1, total_items=0,
            )


class TestProfileSchemas:
    """Each profile schema should accept all-optional ranking columns."""

    def test_journal_profile_accepts_minimum_required_fields(self) -> None:
        profile = JournalProfile(
            journal_id=42,
            title="Sample",
            total_articles=10,
            distinct_authors_total=5,
        )
        assert profile.publisher is None
        assert profile.sjr_index is None
        assert profile.average_authors_per_article_overall is None

    def test_conference_profile_accepts_for_description(self) -> None:
        profile = ConferenceProfile(
            conference_id=1,
            title="EDBT",
            primary_for="4605",
            primary_for_description="Data management and data science",
            total_articles=300,
            distinct_authors_total=120,
        )
        assert profile.primary_for_description == "Data management and data science"

    def test_author_profile_accepts_zero_articles(self) -> None:
        profile = AuthorProfile(
            author_id=1,
            author_name="Alice",
            total_articles=0,
        )
        assert profile.earliest_year is None


class TestYearSummary:
    """Year summary requires both total and distinct author counts."""

    def test_validates_with_all_counts(self) -> None:
        summary = YearSummary(
            year=2015,
            journal_articles=100,
            conference_articles=200,
            total_articles=300,
            distinct_journals=20,
            distinct_conferences=30,
            distinct_authors=400,
            total_authors=800,
        )
        assert summary.total_authors == 800
        assert summary.distinct_authors == 400


class TestPaperDetails:
    """Paper details carry the full author list."""

    def test_validates_with_authors(self) -> None:
        details = PaperDetails(
            article_id=1,
            title="Towards X",
            venue_type="journal",
            venue_id=42,
            venue_title="Sample Journal",
            authors=[
                PaperAuthor(author_id=1, author_name="Alice"),
                PaperAuthor(author_id=2, author_name="Bob"),
            ],
        )
        assert len(details.authors) == 2
        assert details.authors[0].author_name == "Alice"


class TestChartSchemas:
    """Chart-specific point schemas accept the documented metric fields."""

    def test_publisher_quartile_entry(self) -> None:
        entry = PublisherQuartileEntry(
            publisher="Springer",
            best_quartile="Q1",
            journal_count=120,
        )
        assert entry.journal_count == 120

    def test_venue_metrics_point_uses_per_year_authors(self) -> None:
        point = VenueMetricsPoint(
            venue_id=1,
            venue_title="VLDB",
            total_articles=1500,
            average_articles_per_year=30.5,
            average_distinct_authors_per_year=70.2,
        )
        assert point.average_distinct_authors_per_year == 70.2

    def test_authors_vs_articles_point_allows_null_rank(self) -> None:
        point = AuthorsVsArticlesPoint(
            venue_id=1,
            venue_title="Local Workshop",
            rank_or_quartile=None,
            average_articles_per_year=4.2,
            average_authors_per_article_overall=2.1,
            total_articles=42,
        )
        assert point.rank_or_quartile is None
