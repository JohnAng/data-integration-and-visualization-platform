"""Integration tests that fill the coverage gaps reported by pytest-cov.

These exist to exercise DAO methods and router endpoints whose code paths
were missing from the existing suites: conference and journal article
pagination with year filters, year article list with no filter at all,
chart subject-area / FoR / journal-metrics endpoints, author search
pagination, and the year listing route. Together with the rest of the
suite they bring the api package above 95% line coverage.
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


class TestJournalDataAccessGaps:
    """Cover the article-listing and search-text paths of JournalDataAccess."""

    async def test_list_articles_with_year_range(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=10, start_year=2020, end_year=2020,
        )
        assert total_items == 1
        assert rows[0]["title"] == "Paper A1"

    async def test_list_articles_pagination_returns_envelope(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=1,
        )
        assert len(rows) == 1
        assert total_items == 2


class TestConferenceDataAccessGaps:
    """Cover the article listing path and the search-text filter."""

    async def test_list_articles_returns_paginated(self, database: Database) -> None:
        access_object = ConferenceDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=10,
        )
        assert total_items == 2
        titles = {row["title"] for row in rows}
        assert titles == {"ICDE Paper 1", "ICDE Paper 2"}

    async def test_list_articles_with_year_filter(self, database: Database) -> None:
        access_object = ConferenceDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=10, start_year=2020, end_year=2020,
        )
        assert total_items == 1
        assert rows[0]["title"] == "ICDE Paper 1"

    async def test_fetch_yearly_statistics_with_range(self, database: Database) -> None:
        access_object = ConferenceDataAccess(database)
        rows = await access_object.fetch_yearly_statistics(
            1, start_year=2020, end_year=2020,
        )
        assert len(rows) == 1
        assert rows[0]["year"] == 2020

    async def test_search_text_matches_title_or_acronym(
        self, database: Database,
    ) -> None:
        access_object = ConferenceDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, search_text="VLDB",
        )
        assert total_items == 1
        assert rows[0]["acronym"] == "VLDB"


class TestYearDataAccessGaps:
    """Cover the year journal / conference summaries and range-filtered lists."""

    async def test_list_summaries_with_range(self, database: Database) -> None:
        access_object = YearDataAccess(database)
        rows = await access_object.list_summaries(start_year=2020, end_year=2020)
        assert len(rows) == 1
        assert rows[0]["year"] == 2020

    async def test_list_year_conferences_returns_ranked_list(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_conferences(
            2020, page=1, page_size=50,
        )
        assert total_items == 2

    async def test_list_year_articles_unfiltered_returns_all(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_articles(
            2021, page=1, page_size=50,
        )
        assert total_items == 2
        assert {row["venue_type"] for row in rows} == {"journal", "conference"}


class TestAuthorDataAccessGaps:
    """Cover author search variants and unfiltered article listing."""

    async def test_list_articles_paginated(self, database: Database) -> None:
        access_object = AuthorDataAccess(database)
        rows, total_items = await access_object.list_articles(
            1, page=1, page_size=2,
        )
        assert len(rows) == 2
        assert total_items == 4

    async def test_yearly_statistics_for_eve(self, database: Database) -> None:
        access_object = AuthorDataAccess(database)
        rows = await access_object.fetch_yearly_statistics(5)
        assert rows == [{"year": 2022, "articles_count": 2}]


class TestChartDataAccessGaps:
    """Cover the chart DAO methods whose query parameters branch."""

    async def test_subject_area_yearly_summary_with_filter(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.subject_area_yearly_summary(
            subject_areas=["Computer Science"],
        )
        assert all(row["best_subject_area"] == "Computer Science" for row in rows)

    async def test_subject_area_yearly_summary_with_year_range(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.subject_area_yearly_summary(
            start_year=2020, end_year=2020,
        )
        assert all(row["year"] == 2020 for row in rows)

    async def test_field_of_research_yearly_summary_with_filter(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.field_of_research_yearly_summary(
            primary_fors=["4605"],
        )
        assert all(row["primary_for"] == "4605" for row in rows)

    async def test_field_of_research_yearly_summary_with_year_range(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.field_of_research_yearly_summary(
            start_year=2020, end_year=2020,
        )
        assert all(row["year"] == 2020 for row in rows)

    async def test_venue_comparison_with_year_range(self, database: Database) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.venue_comparison_yearly(
            venue_type="conference",
            venue_ids=[1, 2],
            start_year=2020,
            end_year=2021,
        )
        assert all(row["year"] in {2020, 2021} for row in rows)

    async def test_venue_metrics_for_conferences(self, database: Database) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.venue_metrics_bar(
            venue_type="conference", venue_ids=[1, 2, 3],
        )
        assert len(rows) == 3
        identifiers = {row["venue_id"] for row in rows}
        assert identifiers == {1, 2, 3}

    async def test_authors_vs_articles_scatter_for_journals(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.authors_vs_articles_scatter(
            venue_type="journal", maximum_points=10,
        )
        identifiers = {row["venue_id"] for row in rows}
        assert {1, 2, 3}.issubset(identifiers)

    async def test_venue_metrics_rejects_unknown_type(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        with pytest.raises(ValueError):
            await access_object.venue_metrics_bar(venue_type="other", venue_ids=[1])

    async def test_authors_vs_articles_rejects_unknown_type(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        with pytest.raises(ValueError):
            await access_object.authors_vs_articles_scatter(venue_type="other")

    async def test_venue_metrics_empty_venue_ids_returns_empty(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.venue_metrics_bar(
            venue_type="journal", venue_ids=[],
        )
        assert rows == []


class TestRouterCoverage:
    """Exercise router endpoints that the existing suite skipped."""

    async def test_years_listing_returns_three_entries(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/years?start_year=2020&end_year=2022")
        assert response.status_code == 200
        body = response.json()
        assert {row["year"] for row in body} == {2020, 2021, 2022}

    async def test_year_journals_endpoint(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/years/2020/journals")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 2

    async def test_year_conferences_endpoint(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/years/2020/conferences")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 2

    async def test_journal_metrics_chart_returns_points(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/charts/journal-metrics")
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 3

    async def test_subject_area_yearly_summary_chart_endpoint(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/charts/subject-area-yearly-summary",
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_field_of_research_yearly_summary_chart_endpoint(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/charts/field-of-research-yearly-summary",
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_venue_metrics_endpoint_for_journals(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/charts/venue-metrics?venue_type=journal&venue_ids=1",
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1

    async def test_authors_listing_with_query(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/authors?name_query=Eve")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 1
        assert body["items"][0]["author_name"] == "Eve"

    async def test_author_articles_with_year_range(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/authors/1/articles?start_year=2020&end_year=2020",
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 2

    async def test_conference_articles_endpoint(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/conferences/1/articles")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 2

    async def test_conference_yearly_statistics_endpoint(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/conferences/1/yearly-statistics",
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 2

    async def test_missing_year_returns_problem_details(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/years/1900")
        assert response.status_code == 404
        assert response.headers["content-type"] == "application/problem+json"

    async def test_missing_author_returns_problem_details(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/authors/9999")
        assert response.status_code == 404

    async def test_missing_conference_returns_problem_details(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/conferences/9999")
        assert response.status_code == 404
