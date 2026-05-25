"""Unit tests for the ETL normalization helpers."""

from etl.transformer import (
    _normalize_conf_acronym,
    _normalize_journal_title,
)


class TestNormalizeJournalTitle:
    """Cover the journal title normalization function."""

    def test_lowercases_input(self) -> None:
        assert _normalize_journal_title("JOURNAL OF MEDICINE") == "journal of medicine"

    def test_strips_punctuation(self) -> None:
        result = _normalize_journal_title("Cybernetics, Artificial Intelligence!")
        assert "," not in result
        assert "!" not in result

    def test_expands_common_abbreviations(self) -> None:
        result = _normalize_journal_title("IEEE Trans. Knowl. Data Eng.")
        assert "transactions" in result
        assert "knowledge" in result
        assert "engineering" in result

    def test_ampersand_becomes_and(self) -> None:
        assert _normalize_journal_title("Computers & Security") == "computers and security"

    def test_collapses_internal_whitespace(self) -> None:
        result = _normalize_journal_title("Foo    Bar")
        assert "  " not in result

    def test_returns_empty_string_for_empty_input(self) -> None:
        assert _normalize_journal_title("") == ""

    def test_matches_dblp_against_kaggle_canonical_form(self) -> None:
        dblp_form = _normalize_journal_title("IEEE Trans. Knowl. Data Eng.")
        kaggle_form = _normalize_journal_title(
            "IEEE Transactions on Knowledge and Data Engineering"
        )
        assert "transactions" in dblp_form and "transactions" in kaggle_form
        assert "knowledge" in dblp_form and "knowledge" in kaggle_form


class TestNormalizeConfAcronym:
    """Cover the booktitle to acronym normalization function."""

    def test_returns_empty_for_none(self) -> None:
        assert _normalize_conf_acronym(None) == ""

    def test_returns_empty_for_blank(self) -> None:
        assert _normalize_conf_acronym("   ") == ""

    def test_uppercases_output(self) -> None:
        assert _normalize_conf_acronym("edbt") == "EDBT"

    def test_strips_parenthetical_suffix(self) -> None:
        assert _normalize_conf_acronym("EDBT (best of volume)") == "EDBT"

    def test_strips_session_numbers(self) -> None:
        assert _normalize_conf_acronym("HICSS (1)") == "HICSS"

    def test_extracts_parent_from_at_notation(self) -> None:
        assert _normalize_conf_acronym("ADMS@VLDB") == "VLDB"
