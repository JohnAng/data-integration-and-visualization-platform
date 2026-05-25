"""Integration tests for edge cases and combined filters.

These complement test_views.py / test_data_access.py / test_api.py with
scenarios that exercise pagination boundaries, empty result sets, filter
combinations, request validation failures, and unicode handling.

Every expected value still derives from the seed defined in
tests/integration/fixtures/seed.sql.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.data_access.author import AuthorDataAccess
from api.data_access.charts import ChartDataAccess
from api.data_access.conference import ConferenceDataAccess
from api.data_access.journal import JournalDataAccess
from api.data_access.year import YearDataAccess
from api.database import Database
from api.dependencies import get_database
from api.main import create_application

pytestmark = pytest.mark.asyncio


@asynccontextmanager
async def _build_client(database: Database) -> AsyncIterator[AsyncClient]:
    application = create_application()
    application.dependency_overrides[get_database] = lambda: database
    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://test",
    ) as client:
        yield client


@pytest_asyncio.fixture(loop_scope="session")
async def http_client(database: Database) -> AsyncIterator[AsyncClient]:
    async with _build_client(database) as client:
        yield client


class TestPaginationBoundaries:
    """Pagination metadata must remain accurate at the extremes."""

    async def test_page_beyond_data_returns_empty_items_with_correct_total(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(page=99, page_size=10)
        assert rows == []
        assert total_items == 3

    async def test_page_size_zero_is_rejected_by_validation(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals?page_size=0")
        assert response.status_code == 422

    async def test_page_size_above_maximum_is_rejected(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals?page_size=999")
        assert response.status_code == 422

    async def test_page_below_one_is_rejected(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/journals?page=0")
        assert response.status_code == 422


class TestFilterCombinations:
    """Multiple filters on the same endpoint must be ANDed."""

    async def test_journals_publisher_plus_quartile(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, publisher="Publisher X", best_quartile="Q1",
        )
        assert total_items == 1
        assert rows[0]["journal_id"] == 1

    async def test_journals_subject_area_plus_publisher_intersection(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50,
            best_subject_area="Computer Science",
            publisher="Publisher X",
        )
        assert total_items == 2
        assert {row["journal_id"] for row in rows} == {1, 2}

    async def test_journals_search_plus_quartile(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, search_text="Test Journal", best_quartile="Q2",
        )
        assert total_items == 1
        assert rows[0]["journal_id"] == 2

    async def test_conferences_rank_plus_for_code_intersection(
        self, database: Database,
    ) -> None:
        access_object = ConferenceDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, rank_value="A*", primary_for="4605",
        )
        assert total_items == 2

    async def test_year_articles_journal_plus_author_filter(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_articles(
            2020, page=1, page_size=50, journal_id=1, author_id=2,
        )
        assert total_items == 1
        assert rows[0]["title"] == "Paper A1"
        assert rows[0]["venue_type"] == "journal"


class TestEmptyResultSets:
    """Filters that exclude everything must still return a well-formed envelope."""

    async def test_journals_with_nonexistent_publisher_returns_empty(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, publisher="Nonexistent Publisher",
        )
        assert rows == []
        assert total_items == 0

    async def test_year_range_excluding_all_data_yields_zero_stats(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        profile = await access_object.fetch_profile(
            1, start_year=1900, end_year=1901,
        )
        assert profile is not None
        assert profile["total_articles"] == 0
        assert profile["earliest_year"] is None
        assert profile["latest_year"] is None
        assert profile["distinct_authors_total"] == 0

    async def test_yearly_statistics_with_narrow_range_returns_subset(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        rows = await access_object.fetch_yearly_statistics(
            1, start_year=2020, end_year=2020,
        )
        assert len(rows) == 1
        assert rows[0]["year"] == 2020

    async def test_year_articles_filter_with_no_matches_returns_empty(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_articles(
            2020, page=1, page_size=50, author_id=5,
        )
        assert rows == []
        assert total_items == 0


class TestYearRangeRecomputation:
    """fetch_profile with a year range recomputes every aggregate."""

    async def test_journal_profile_2020_only_drops_2021_article(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        profile = await access_object.fetch_profile(1, start_year=2020, end_year=2020)
        assert profile is not None
        assert profile["total_articles"] == 1
        assert profile["earliest_year"] == 2020
        assert profile["latest_year"] == 2020
        assert profile["distinct_authors_total"] == 2

    async def test_conference_profile_2021_only_recomputes(
        self, database: Database,
    ) -> None:
        access_object = ConferenceDataAccess(database)
        profile = await access_object.fetch_profile(1, start_year=2021, end_year=2021)
        assert profile is not None
        assert profile["total_articles"] == 1
        assert profile["earliest_year"] == 2021
        assert profile["latest_year"] == 2021
        assert profile["distinct_authors_total"] == 1


class TestAuthorArticleFiltering:
    """Author article listings must honour the year range."""

    async def test_alice_articles_filtered_to_2020(
        self, database: Database,
    ) -> None:
        access_object = AuthorDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=50, start_year=2020, end_year=2020,
        )
        assert total_items == 2
        titles = {row["title"] for row in rows}
        assert titles == {"Paper A1", "ICDE Paper 1"}

    async def test_alice_articles_filtered_to_2022_only(
        self, database: Database,
    ) -> None:
        access_object = AuthorDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=50, start_year=2022, end_year=2022,
        )
        assert total_items == 1
        assert rows[0]["title"] == "VLDB Paper 1"


class TestChartDataIntegrity:
    """Charts must produce coherent values consistent with the underlying tables."""

    async def test_subject_area_yearly_summary_counts_only_journals(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.subject_area_yearly_summary()
        per_year_total = sum(row["articles_count"] for row in rows)
        assert per_year_total == 4

    async def test_field_of_research_yearly_summary_excludes_null_for_codes(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.field_of_research_yearly_summary()
        assert all(row["primary_for"] is not None for row in rows)

    async def test_venue_comparison_returns_no_rows_for_empty_venue_list(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.venue_comparison_yearly(
            venue_type="journal", venue_ids=[],
        )
        assert rows == []

    async def test_venue_comparison_rejects_unknown_venue_type(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        with pytest.raises(ValueError):
            await access_object.venue_comparison_yearly(
                venue_type="bogus", venue_ids=[1],
            )

    async def test_journal_metrics_filters_combine_subject_and_quartile(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.journal_metrics_for_scatter(
            best_subject_area="Computer Science",
            best_quartile="Q1",
            maximum_points=10,
        )
        assert len(rows) == 1
        assert rows[0]["journal_id"] == 1


class TestApiValidation:
    """The HTTP layer maps validation failures into RFC 7807 bodies."""

    async def test_invalid_quartile_format(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/journals?best_quartile=Q9")
        assert response.status_code == 422
        body = response.json()
        assert body["status"] == 422
        assert "best_quartile" in body["detail"]

    async def test_invalid_year_below_minimum(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/journals/1?start_year=1800")
        assert response.status_code == 422

    async def test_invalid_venue_type_on_chart(self, http_client: AsyncClient) -> None:
        response = await http_client.get(
            "/api/charts/authors-vs-articles-scatter?venue_type=foobar",
        )
        assert response.status_code == 422

    async def test_negative_path_id_is_rejected(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/journals/-1")
        assert response.status_code == 422


class TestApiPaginationContract:
    """Paginated endpoints must always return a complete envelope."""

    async def test_pagination_envelope_present_on_empty_match(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/journals?publisher=Nonexistent",
        )
        assert response.status_code == 200
        body = response.json()
        assert body == {"items": [], "page": 1, "page_size": 50, "total_items": 0}

    async def test_pagination_envelope_present_on_deep_page(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals?page=10&page_size=10")
        assert response.status_code == 200
        body = response.json()
        assert body["items"] == []
        assert body["total_items"] == 3
        assert body["page"] == 10


class TestApiFilteredProfile:
    """The filtered-profile path computes the same answer as the DAO layer."""

    async def test_journal_profile_with_year_range_matches_dao(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/journals/1?start_year=2020&end_year=2020",
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_articles"] == 1
        assert body["earliest_year"] == 2020
        assert body["latest_year"] == 2020
        assert body["distinct_authors_total"] == 2

    async def test_journal_yearly_statistics_with_narrow_window(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/journals/1/yearly-statistics?start_year=2021&end_year=2021",
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["year"] == 2021


class TestApiPaperDetailsConsistency:
    """Paper-detail responses must be consistent with the article list."""

    async def test_journal_paper_belongs_to_correct_venue(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals/1/articles/2")
        assert response.status_code == 200
        body = response.json()
        assert body["venue_id"] == 1
        assert body["venue_type"] == "journal"
        assert body["title"] == "Paper A2"

    async def test_journal_paper_not_in_other_journal_returns_404(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals/2/articles/1")
        assert response.status_code == 404
        assert response.headers["content-type"] == "application/problem+json"


class TestApiYearArticlesFilterCombinations:
    """Year articles route honours each combination of filters."""

    async def test_year_filter_by_conference_returns_only_that_venue(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/years/2020/articles?conference_id=1")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 1
        assert body["items"][0]["venue_type"] == "conference"
        assert body["items"][0]["title"] == "ICDE Paper 1"

    async def test_year_articles_with_unsatisfiable_filter_returns_empty(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/years/2020/articles?conference_id=99999",
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 0
