"""Integration tests for the HTTP API against a real database.

The application lifespan is disabled so the asyncmy pool the production
factory would open is not created. Instead the get_database dependency
is overridden to return the test database fixture, so the routes hit
the same fixture-seeded MySQL instance the DAO tests use.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from api.database import Database
from api.dependencies import get_database
from api.main import create_application

pytestmark = pytest.mark.asyncio


@asynccontextmanager
async def _client_with_database(database: Database) -> AsyncIterator[AsyncClient]:
    """Build the application, override the database dependency, yield a client."""
    application = create_application()
    application.dependency_overrides[get_database] = lambda: database
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture(loop_scope="session")
async def http_client(database: Database) -> AsyncIterator[AsyncClient]:
    """Yield an httpx AsyncClient bound to the application + test database."""
    async with _client_with_database(database) as client:
        yield client


class TestHealthEndpoint:
    """The liveness probe should return a plain ok payload."""

    async def test_returns_ok_status(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestMetaEndpoints:
    """The corpus totals view should expose hand-computable counts.

    Expected values, derived directly from fixtures/seed.sql:
      total_journal_articles    = 4
      total_conference_articles = 4
      total_articles            = 8
      total_authors             = 5
      total_journals            = 3
      total_conferences         = 3
      earliest_year             = 2020
      latest_year               = 2022
    """

    async def test_totals_returns_hand_computed_counts(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/meta/totals")
        assert response.status_code == 200
        body = response.json()
        assert body["total_journal_articles"] == 4
        assert body["total_conference_articles"] == 4
        assert body["total_articles"] == 8
        assert body["total_authors"] == 5
        assert body["total_journals"] == 3
        assert body["total_conferences"] == 3
        assert body["earliest_year"] == 2020
        assert body["latest_year"] == 2022

    async def test_options_returns_distinct_filter_values(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/meta/options")
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body["subject_areas"], list)
        assert isinstance(body["publishers"], list)
        assert isinstance(body["fields_of_research"], list)
        assert isinstance(body["conference_ranks"], list)
        for entry in body["publishers"]:
            assert "name" in entry
            assert "journal_count" in entry
            assert entry["journal_count"] >= 1
        for entry in body["fields_of_research"]:
            assert "code" in entry


class TestJournalsEndpoints:
    """End-to-end coverage of the journal router contract."""

    async def test_list_returns_paginated_envelope(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/journals?page=1&page_size=10")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 3
        assert body["page"] == 1
        assert {item["title"] for item in body["items"]} == {
            "Test Journal A", "Test Journal B", "Test Journal C",
        }

    async def test_profile_returns_aggregates(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/journals/1")
        assert response.status_code == 200
        body = response.json()
        assert body["journal_id"] == 1
        assert body["total_articles"] == 2
        assert body["distinct_authors_total"] == 3

    async def test_profile_with_year_range_filter_recomputes(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/journals/1?start_year=2020&end_year=2020",
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total_articles"] == 1
        assert body["distinct_authors_total"] == 2

    async def test_paper_details_returns_full_author_list(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals/1/articles/1")
        assert response.status_code == 200
        body = response.json()
        assert body["venue_type"] == "journal"
        names = sorted(author["author_name"] for author in body["authors"])
        assert names == ["Alice", "Bob"]

    async def test_missing_journal_returns_problem_details(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/journals/9999")
        assert response.status_code == 404
        assert response.headers["content-type"] == "application/problem+json"
        body = response.json()
        assert body["status"] == 404
        assert "9999" in body["detail"]


class TestConferencesEndpoints:
    """End-to-end coverage of the conference router contract."""

    async def test_list_filtered_by_rank(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/conferences?rank_value=A*")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 2

    async def test_profile_exposes_field_of_research_description(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/conferences/1")
        assert response.status_code == 200
        body = response.json()
        assert body["primary_for_description"] == "Data management and data science"
        assert body["total_articles"] == 2

    async def test_paper_details_returns_three_co_authors_for_icde_paper_one(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/conferences/1/articles/1")
        assert response.status_code == 200
        body = response.json()
        names = sorted(author["author_name"] for author in body["authors"])
        assert names == ["Alice", "Bob", "Charlie"]


class TestYearsEndpoints:
    """End-to-end coverage of the year router contract."""

    async def test_summary_lists_seeded_years(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/years")
        assert response.status_code == 200
        body = response.json()
        assert [row["year"] for row in body] == [2020, 2021, 2022]

    async def test_year_articles_filtered_by_author(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/years/2020/articles?author_id=1")
        assert response.status_code == 200
        body = response.json()
        titles = {item["title"] for item in body["items"]}
        assert titles == {"Paper A1", "ICDE Paper 1"}

    async def test_year_articles_filtered_by_journal_excludes_conferences(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/years/2020/articles?journal_id=2")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 1
        assert body["items"][0]["title"] == "Paper B1"


class TestAuthorsEndpoints:
    """End-to-end coverage of the author router contract."""

    async def test_search_returns_all_seeded_authors(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/authors")
        assert response.status_code == 200
        body = response.json()
        assert body["total_items"] == 5

    async def test_profile_for_alice_yields_four_articles(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get("/api/authors/1")
        assert response.status_code == 200
        body = response.json()
        assert body["author_name"] == "Alice"
        assert body["total_articles"] == 4

    async def test_yearly_statistics_per_year(self, http_client: AsyncClient) -> None:
        response = await http_client.get("/api/authors/1/yearly-statistics")
        assert response.status_code == 200
        body = response.json()
        year_to_count = {row["year"]: row["articles_count"] for row in body}
        assert year_to_count == {2020: 2, 2021: 1, 2022: 1}


class TestChartsEndpoints:
    """End-to-end coverage of the chart router contract."""

    async def test_publisher_quartile_distribution(self, http_client: AsyncClient) -> None:
        response = await http_client.get(
            "/api/charts/publisher-quartile-distribution",
        )
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 3
        triples = {(row["publisher"], row["best_quartile"], row["journal_count"]) for row in body}
        assert triples == {
            ("Publisher X", "Q1", 1),
            ("Publisher X", "Q2", 1),
            ("Publisher Y", "Q3", 1),
        }

    async def test_venue_comparison_requires_venue_ids(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/charts/venue-comparison?venue_type=journal",
        )
        assert response.status_code == 422
        assert response.headers["content-type"] == "application/problem+json"

    async def test_authors_vs_articles_scatter_returns_metric_per_venue(
        self, http_client: AsyncClient,
    ) -> None:
        response = await http_client.get(
            "/api/charts/authors-vs-articles-scatter?venue_type=conference",
        )
        assert response.status_code == 200
        body = response.json()
        by_venue = {row["venue_id"]: row for row in body}
        assert by_venue[1]["total_articles"] == 2
