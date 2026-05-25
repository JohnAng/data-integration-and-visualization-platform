"""Integration tests for the data access objects.

These tests target the public contract of each DAO class against the
fixture seed: pagination metadata, filter combinations, year-range
recomputation, paper-detail joins and chart aggregations. Every
expected value is hand-derived from tests/integration/fixtures/seed.sql.
"""

from decimal import Decimal

import pytest

from api.data_access.author import AuthorDataAccess
from api.data_access.charts import ChartDataAccess
from api.data_access.conference import ConferenceDataAccess
from api.data_access.journal import JournalDataAccess
from api.data_access.year import YearDataAccess
from api.database import Database

pytestmark = pytest.mark.asyncio


class TestJournalDataAccess:
    """Journal DAO surface required by the brief's per-journal page."""

    async def test_list_summaries_returns_all_three_journals(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(page=1, page_size=50)
        assert total_items == 3
        assert [row["title"] for row in rows] == [
            "Test Journal A", "Test Journal B", "Test Journal C",
        ]

    async def test_list_summaries_filters_by_quartile(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, best_quartile="Q2",
        )
        assert total_items == 1
        assert rows[0]["journal_id"] == 2

    async def test_list_summaries_filters_by_publisher(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, publisher="Publisher X",
        )
        assert total_items == 2
        assert {row["journal_id"] for row in rows} == {1, 2}

    async def test_fetch_profile_without_year_range_uses_view(self, database: Database) -> None:
        access_object = JournalDataAccess(database)
        profile = await access_object.fetch_profile(1)
        assert profile is not None
        assert profile["total_articles"] == 2
        assert profile["earliest_year"] == 2020
        assert profile["latest_year"] == 2021

    async def test_fetch_profile_with_year_range_recomputes_statistics(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        narrowed = await access_object.fetch_profile(1, start_year=2020, end_year=2020)
        assert narrowed is not None
        assert narrowed["total_articles"] == 1
        assert narrowed["earliest_year"] == 2020
        assert narrowed["latest_year"] == 2020
        assert narrowed["distinct_authors_total"] == 2

    async def test_fetch_yearly_statistics_returns_per_year_rows(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        rows = await access_object.fetch_yearly_statistics(1)
        assert [row["year"] for row in rows] == [2020, 2021]
        assert rows[0]["total_authors"] == 2
        assert rows[1]["total_authors"] == 2

    async def test_fetch_article_with_authors_returns_full_list(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        result = await access_object.fetch_article_with_authors(1)
        assert result is not None
        assert result["title"] == "Paper A1"
        assert result["venue_type"] == "journal"
        assert result["venue_title"] == "Test Journal A"
        author_names = [author["author_name"] for author in result["authors"]]
        assert sorted(author_names) == ["Alice", "Bob"]

    async def test_fetch_article_with_authors_returns_none_when_missing(
        self, database: Database,
    ) -> None:
        access_object = JournalDataAccess(database)
        assert await access_object.fetch_article_with_authors(9999) is None


class TestConferenceDataAccess:
    """Conference DAO surface required by the brief's per-conference page."""

    async def test_list_summaries_returns_all_three_conferences(
        self, database: Database,
    ) -> None:
        access_object = ConferenceDataAccess(database)
        rows, total_items = await access_object.list_summaries(page=1, page_size=50)
        assert total_items == 3

    async def test_list_summaries_filters_by_rank(self, database: Database) -> None:
        access_object = ConferenceDataAccess(database)
        rows, total_items = await access_object.list_summaries(
            page=1, page_size=50, rank_value="A*",
        )
        assert total_items == 2

    async def test_fetch_profile_with_year_range_recomputes(self, database: Database) -> None:
        access_object = ConferenceDataAccess(database)
        narrowed = await access_object.fetch_profile(1, start_year=2021, end_year=2021)
        assert narrowed is not None
        assert narrowed["total_articles"] == 1
        assert narrowed["distinct_authors_total"] == 1

    async def test_fetch_article_with_authors_includes_three_co_authors(
        self, database: Database,
    ) -> None:
        access_object = ConferenceDataAccess(database)
        result = await access_object.fetch_article_with_authors(1)
        assert result is not None
        assert result["venue_type"] == "conference"
        assert result["venue_title"] == "International Conference on Data Engineering"
        author_names = [author["author_name"] for author in result["authors"]]
        assert sorted(author_names) == ["Alice", "Bob", "Charlie"]


class TestYearDataAccess:
    """Year DAO surface required by the brief's per-year details page."""

    async def test_list_summaries_returns_three_years(self, database: Database) -> None:
        access_object = YearDataAccess(database)
        rows = await access_object.list_summaries()
        assert [row["year"] for row in rows] == [2020, 2021, 2022]

    async def test_fetch_summary_returns_known_2020_totals(self, database: Database) -> None:
        access_object = YearDataAccess(database)
        row = await access_object.fetch_summary(2020)
        assert row is not None
        assert row["total_articles"] == 4
        assert row["distinct_authors"] == 4
        assert row["total_authors"] == 9

    async def test_list_year_articles_unfiltered_returns_both_venue_types(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_articles(
            2020, page=1, page_size=50,
        )
        assert total_items == 4
        venue_types = {row["venue_type"] for row in rows}
        assert venue_types == {"journal", "conference"}

    async def test_list_year_articles_filter_by_journal_drops_conferences(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_articles(
            2020, page=1, page_size=50, journal_id=1,
        )
        assert total_items == 1
        assert rows[0]["venue_type"] == "journal"
        assert rows[0]["title"] == "Paper A1"

    async def test_list_year_articles_filter_by_author_returns_only_their_papers(
        self, database: Database,
    ) -> None:
        access_object = YearDataAccess(database)
        rows, total_items = await access_object.list_year_articles(
            2020, page=1, page_size=50, author_id=1,
        )
        titles = {row["title"] for row in rows}
        assert titles == {"Paper A1", "ICDE Paper 1"}
        assert total_items == 2


class TestAuthorDataAccess:
    """Author DAO surface required by the brief's per-author page."""

    async def test_search_returns_all_five_authors(self, database: Database) -> None:
        access_object = AuthorDataAccess(database)
        rows, total_items = await access_object.search(page=1, page_size=50)
        assert total_items == 5

    async def test_search_filters_by_name_substring(self, database: Database) -> None:
        access_object = AuthorDataAccess(database)
        rows, total_items = await access_object.search(
            page=1, page_size=50, name_query="al",
        )
        assert any(row["author_name"] == "Alice" for row in rows)

    async def test_fetch_profile_for_alice(self, database: Database) -> None:
        access_object = AuthorDataAccess(database)
        profile = await access_object.fetch_profile(1)
        assert profile is not None
        assert profile["author_name"] == "Alice"
        assert profile["total_articles"] == 4
        assert profile["earliest_year"] == 2020
        assert profile["latest_year"] == 2022

    async def test_fetch_yearly_statistics_alice_spans_three_years(
        self, database: Database,
    ) -> None:
        access_object = AuthorDataAccess(database)
        rows = await access_object.fetch_yearly_statistics(1)
        year_to_count = {row["year"]: row["articles_count"] for row in rows}
        assert year_to_count == {2020: 2, 2021: 1, 2022: 1}

    async def test_list_articles_returns_journal_and_conference_papers(
        self, database: Database,
    ) -> None:
        access_object = AuthorDataAccess(database)
        rows, total_items = await access_object.list_articles(1, page=1, page_size=50)
        assert total_items == 4
        venue_types = [row["venue_type"] for row in rows]
        assert venue_types.count("journal") == 2
        assert venue_types.count("conference") == 2


class TestChartDataAccess:
    """Chart DAO surface backing the chart components."""

    async def test_publisher_quartile_distribution(self, database: Database) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.publisher_quartile_distribution()
        assert rows == [
            {"publisher": "Publisher X", "best_quartile": "Q1", "journal_count": 1},
            {"publisher": "Publisher X", "best_quartile": "Q2", "journal_count": 1},
            {"publisher": "Publisher Y", "best_quartile": "Q3", "journal_count": 1},
        ]

    async def test_venue_comparison_returns_per_year_series_for_selected_venues(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.venue_comparison_yearly(
            venue_type="journal", venue_ids=[1, 2],
        )
        by_venue = {(row["venue_id"], row["year"]): row for row in rows}
        assert (1, 2020) in by_venue
        assert (1, 2021) in by_venue
        assert (2, 2020) in by_venue
        assert by_venue[(1, 2020)]["articles_count"] == 1
        assert by_venue[(1, 2020)]["total_authors"] == 2

    async def test_venue_metrics_bar_exposes_authors_per_year(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.venue_metrics_bar(
            venue_type="journal", venue_ids=[1],
        )
        assert len(rows) == 1
        assert rows[0]["total_articles"] == 2
        assert rows[0]["average_articles_per_year"] == Decimal("1.00")
        assert rows[0]["average_distinct_authors_per_year"] == Decimal("2.0000")

    async def test_authors_vs_articles_scatter_uses_overall_averages(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.authors_vs_articles_scatter(
            venue_type="journal", maximum_points=10,
        )
        by_venue = {row["venue_id"]: row for row in rows}
        assert by_venue[1]["average_articles_per_year"] == Decimal("1.00")
        assert by_venue[1]["average_authors_per_article_overall"] == Decimal("2.00")
        assert by_venue[1]["total_articles"] == 2

    async def test_journal_metrics_for_scatter_filters_by_quartile(
        self, database: Database,
    ) -> None:
        access_object = ChartDataAccess(database)
        rows = await access_object.journal_metrics_for_scatter(
            best_quartile="Q1", maximum_points=10,
        )
        assert len(rows) == 1
        assert rows[0]["journal_id"] == 1
