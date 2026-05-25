"""Integration tests for the analytical views against a deterministic fixture.

Every expected value is derived from tests/integration/fixtures/seed.sql by
hand. If you change the seed, recompute and update these assertions.
"""

from decimal import Decimal

import pytest

from api.database import Database

pytestmark = pytest.mark.asyncio


class TestViewJournalProfile:
    """view_journal_profile mirrors the brief's per-journal statistics."""

    async def test_journal_one_aggregates_from_two_articles(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_journal_profile WHERE journal_id = %s", (1,),
        )
        assert row is not None
        assert row["title"] == "Test Journal A"
        assert row["publisher"] == "Publisher X"
        assert row["best_quartile"] == "Q1"
        assert row["total_articles"] == 2
        assert row["earliest_year"] == 2020
        assert row["latest_year"] == 2021
        assert row["distinct_authors_total"] == 3
        assert row["average_articles_per_year"] == Decimal("1.00")
        assert row["average_authors_per_article_overall"] == Decimal("2.00")

    async def test_journal_three_with_single_article_yields_unitary_averages(
        self, database: Database,
    ) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_journal_profile WHERE journal_id = %s", (3,),
        )
        assert row is not None
        assert row["total_articles"] == 1
        assert row["earliest_year"] == 2022
        assert row["latest_year"] == 2022
        assert row["distinct_authors_total"] == 1
        assert row["average_articles_per_year"] == Decimal("1.00")
        assert row["average_authors_per_article_overall"] == Decimal("1.00")


class TestViewConferenceProfile:
    """view_conference_profile mirrors view_journal_profile for conferences."""

    async def test_icde_aggregates_match_known_seed(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_conference_profile WHERE conference_id = %s", (1,),
        )
        assert row is not None
        assert row["acronym"] == "ICDE"
        assert row["rank_value"] == "A*"
        assert row["primary_for"] == "4605"
        assert row["primary_for_description"] == "Data management and data science"
        assert row["total_articles"] == 2
        assert row["earliest_year"] == 2020
        assert row["latest_year"] == 2021
        assert row["distinct_authors_total"] == 4
        assert row["average_articles_per_year"] == Decimal("1.00")
        assert row["average_authors_per_article_overall"] == Decimal("2.00")

    async def test_unranked_conference_exposes_null_rank(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_conference_profile WHERE conference_id = %s", (3,),
        )
        assert row is not None
        assert row["rank_value"] is None
        assert row["primary_for"] is None
        assert row["primary_for_description"] is None


class TestViewYearSummary:
    """view_year_summary collapses both fact tables and their bridges per year."""

    async def test_year_2020_counts(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_year_summary WHERE year = %s", (2020,),
        )
        assert row is not None
        assert row["journal_articles"] == 2
        assert row["conference_articles"] == 2
        assert row["total_articles"] == 4
        assert row["distinct_journals"] == 2
        assert row["distinct_conferences"] == 2
        assert row["distinct_authors"] == 4
        assert row["total_authors"] == 9

    async def test_year_2022_counts(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_year_summary WHERE year = %s", (2022,),
        )
        assert row is not None
        assert row["journal_articles"] == 1
        assert row["conference_articles"] == 1
        assert row["total_articles"] == 2
        assert row["distinct_journals"] == 1
        assert row["distinct_conferences"] == 1
        assert row["distinct_authors"] == 2
        assert row["total_authors"] == 3


class TestViewAuthorProfile:
    """view_author_profile spans both fact tables for each author."""

    async def test_alice_publishes_across_both_venue_types(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_author_profile WHERE author_id = %s", (1,),
        )
        assert row is not None
        assert row["author_name"] == "Alice"
        assert row["total_articles"] == 4
        assert row["earliest_year"] == 2020
        assert row["latest_year"] == 2022
        assert row["average_articles_per_year"] == Decimal("1.33")

    async def test_eve_publishes_only_in_2022(self, database: Database) -> None:
        row = await database.fetch_one(
            "SELECT * FROM view_author_profile WHERE author_id = %s", (5,),
        )
        assert row is not None
        assert row["total_articles"] == 2
        assert row["earliest_year"] == 2022
        assert row["latest_year"] == 2022
        assert row["average_articles_per_year"] == Decimal("2.00")


class TestViewPublisherQuartileDistribution:
    """One row per (publisher, quartile) with the journal count."""

    async def test_each_publisher_quartile_pair_has_count_one(self, database: Database) -> None:
        rows = await database.fetch_all(
            "SELECT publisher, best_quartile, journal_count "
            "FROM view_publisher_quartile_distribution "
            "ORDER BY publisher, best_quartile",
        )
        assert rows == [
            {"publisher": "Publisher X", "best_quartile": "Q1", "journal_count": 1},
            {"publisher": "Publisher X", "best_quartile": "Q2", "journal_count": 1},
            {"publisher": "Publisher Y", "best_quartile": "Q3", "journal_count": 1},
        ]


class TestViewYearlyStatistics:
    """Per-year statistics views feed the line charts."""

    async def test_journal_yearly_statistics_emit_distinct_and_total_authors(
        self, database: Database,
    ) -> None:
        rows = await database.fetch_all(
            "SELECT year, articles_count, distinct_authors, total_authors, "
            "average_authors_per_article "
            "FROM view_journal_yearly_statistics "
            "WHERE journal_id = %s ORDER BY year",
            (1,),
        )
        assert len(rows) == 2
        assert rows[0]["year"] == 2020
        assert rows[0]["articles_count"] == 1
        assert rows[0]["distinct_authors"] == 2
        assert rows[0]["total_authors"] == 2
        assert rows[0]["average_authors_per_article"] == Decimal("2.00")
        assert rows[1]["year"] == 2021
        assert rows[1]["articles_count"] == 1
        assert rows[1]["distinct_authors"] == 2
        assert rows[1]["total_authors"] == 2

    async def test_conference_yearly_statistics_for_icde(self, database: Database) -> None:
        rows = await database.fetch_all(
            "SELECT year, articles_count, distinct_authors, total_authors "
            "FROM view_conference_yearly_statistics "
            "WHERE conference_id = %s ORDER BY year",
            (1,),
        )
        assert rows == [
            {"year": 2020, "articles_count": 1, "distinct_authors": 3, "total_authors": 3},
            {"year": 2021, "articles_count": 1, "distinct_authors": 1, "total_authors": 1},
        ]


class TestViewFieldOfResearchYearlySummary:
    """Per (FoR code, year) conference counts. Conferences with NULL FoR excluded."""

    async def test_only_ranked_conferences_appear(self, database: Database) -> None:
        rows = await database.fetch_all(
            "SELECT primary_for, primary_for_description, year, "
            "distinct_conferences, articles_count "
            "FROM view_field_of_research_yearly_summary "
            "ORDER BY year",
        )
        assert all(row["primary_for"] == "4605" for row in rows)
        assert all(row["primary_for_description"] == "Data management and data science" for row in rows)
        years_with_distinct_counts = {row["year"]: row["distinct_conferences"] for row in rows}
        assert years_with_distinct_counts == {2020: 1, 2021: 1, 2022: 1}
