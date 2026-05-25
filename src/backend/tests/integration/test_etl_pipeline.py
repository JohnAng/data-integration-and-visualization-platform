"""End-to-end tests for the ETL pipeline using a tiny fixture source tree.

These tests exercise every extract method on DataTransformer plus the
DataExporter against a deterministic mini dataset shipped under
tests/integration/fixtures/etl_inputs/. The fixture contains six article
rows, six inproceedings rows, three journal ranking rows, three iCore
conferences and four Field of Research codes, designed to drive every
branch of the transformer (matched, fuzzy-matched, unmatched, rejected)
without touching the production data files.
"""

from pathlib import Path

import polars as pl

from etl.exporter import DataExporter
from etl.transformer import DataTransformer

FIXTURE_DATA_ROOT: Path = Path(__file__).parent / "fixtures" / "etl_inputs"


def _build_transformer() -> DataTransformer:
    return DataTransformer(data_root=FIXTURE_DATA_ROOT)


class TestTransformerExtractMethods:
    """Each public extract method must yield a shape consistent with its view."""

    def test_extract_for_categories_loads_xlsx_rows(self) -> None:
        transformer = _build_transformer()
        frame = transformer.extract_for_categories()
        assert {"code", "description", "parent_code"} == set(frame.columns)
        codes = set(frame["code"].to_list())
        assert "4601" in codes
        assert "CSE" in codes

    def test_extract_authors_explodes_pipe_separated_names(self) -> None:
        transformer = _build_transformer()
        frame = transformer.extract_authors()
        assert set(frame.columns) == {"author_id", "author_name"}
        names = set(frame["author_name"].to_list())
        assert {"Alice Smith", "Bob Jones", "Charlie Brown", "Diana White"}.issubset(names)
        assert len(names) == len(frame), "duplicates should have been collapsed"

    def test_extract_journals_returns_one_row_per_distinct_dblp_journal(self) -> None:
        transformer = _build_transformer()
        frame = transformer.extract_journals()
        titles = set(frame["title"].to_list())
        assert "IEEE Trans. Knowl. Data Eng." in titles
        assert "Inf. Syst." in titles
        matched_kaggle = frame.filter(pl.col("publisher").is_not_null())
        assert matched_kaggle.height >= 1
        statistics = transformer.match_stats
        assert statistics["journals_total"] == len(titles)
        assert statistics["journals_exact"] + statistics["journals_acronym"] + statistics["journals_fuzzy"] >= 1

    def test_extract_conferences_canonicalizes_workshop_variants(self) -> None:
        transformer = _build_transformer()
        frame = transformer.extract_conferences()
        titles = set(frame["title"].to_list())
        assert "EDBT" in titles
        assert "EDBT (best of volume)" not in titles
        matched = frame.filter(pl.col("rank_value").is_not_null())
        assert matched.height >= 2

    def test_extract_fact_journals_drops_rows_without_venue_or_title(self) -> None:
        transformer = _build_transformer()
        lookup = transformer.extract_journals()
        facts = transformer.extract_fact_journals(lookup)
        assert "article_id" in facts.columns
        assert "journal_id" in facts.columns
        assert "title" in facts.columns
        assert facts.height >= 1
        assert facts.filter(pl.col("title").is_null()).height == 0

    def test_extract_fact_conferences_uses_canonical_booktitle(self) -> None:
        transformer = _build_transformer()
        lookup = transformer.extract_conferences()
        facts = transformer.extract_fact_conferences(lookup)
        assert "article_id" in facts.columns
        assert "conference_id" in facts.columns
        assert facts.height >= 2

    def test_extract_bridge_tables_uses_case_insensitive_join(self) -> None:
        transformer = _build_transformer()
        lookup_authors = transformer.extract_authors()
        lookup_journals = transformer.extract_journals()
        journal_facts = transformer.extract_fact_journals(lookup_journals)
        bridge = transformer.extract_bridge_tables(
            "input_article.csv", journal_facts, lookup_authors,
        )
        assert set(bridge.columns) == {"article_id", "author_id"}
        assert bridge.height >= 1

    def test_extract_rejections_captures_missing_venue_and_title(self) -> None:
        transformer = _build_transformer()
        lookup_journals = transformer.extract_journals()
        transformer.extract_fact_journals(lookup_journals)
        rejections = transformer.extract_rejections()
        reasons = set(rejections["reason"].to_list())
        assert "missing_journal" in reasons or "missing_title" in reasons


class TestTransformAll:
    """transform_all orchestrates the nine output frames with stable keys."""

    def test_returns_all_nine_expected_keys(self) -> None:
        transformer = _build_transformer()
        datasets = transformer.transform_all()
        assert set(datasets.keys()) == {
            "lookup_field_of_research_categories",
            "lookup_authors",
            "lookup_journals",
            "lookup_conferences",
            "fact_journal_articles",
            "fact_conference_articles",
            "bridge_journal_article_authors",
            "bridge_conference_article_authors",
            "rejection_logs",
        }

    def test_match_stats_populate_after_run(self) -> None:
        transformer = _build_transformer()
        transformer.transform_all()
        assert transformer.match_stats["journals_total"] >= 1
        assert transformer.match_stats["conferences_canonical"] >= 1
        assert transformer.match_stats["rejections_total"] >= 1

    def test_sample_rows_limit_applies_to_dblp_sources(self) -> None:
        transformer = DataTransformer(data_root=FIXTURE_DATA_ROOT, sample_rows=2)
        datasets = transformer.transform_all()
        assert datasets["fact_journal_articles"].height <= 2
        assert datasets["fact_conference_articles"].height <= 2


class TestExporter:
    """DataExporter serializes every frame to its matching csv filename."""

    def test_writes_one_csv_per_dataset(self, tmp_path: Path) -> None:
        transformer = _build_transformer()
        datasets = transformer.transform_all()
        exporter = DataExporter(output_dir=str(tmp_path / "exports"))
        exporter.output_path = tmp_path / "exports"
        exporter.output_path.mkdir(parents=True, exist_ok=True)
        exporter.export_datasets(datasets)
        for table_name in datasets:
            csv_path = exporter.output_path / f"{table_name}.csv"
            assert csv_path.exists(), f"missing csv for {table_name}"
            assert csv_path.stat().st_size > 0

    def test_csv_uses_null_sentinel_for_missing_values(self, tmp_path: Path) -> None:
        transformer = _build_transformer()
        datasets = transformer.transform_all()
        rejection_frame = datasets["rejection_logs"]
        export_directory = tmp_path / "exports"
        export_directory.mkdir(parents=True, exist_ok=True)
        exporter = DataExporter()
        exporter.output_path = export_directory
        exporter.export_datasets({"rejection_logs": rejection_frame})
        content = (export_directory / "rejection_logs.csv").read_text(encoding="utf-8")
        assert "\\N" in content or rejection_frame.null_count().sum_horizontal().item() == 0
