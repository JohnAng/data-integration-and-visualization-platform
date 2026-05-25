"""Unit tests for the Kaggle to DBLP acronym generation heuristic."""

from etl.transformer import (
    _generate_journal_acronyms,
    _looks_like_acronym,
)


class TestGenerateJournalAcronyms:
    """Verify that plausible DBLP shorthands are produced for known patterns."""

    def test_returns_empty_for_empty_input(self) -> None:
        assert _generate_journal_acronyms("") == []

    def test_acm_transactions_pattern_yields_t_initials(self) -> None:
        result = _generate_journal_acronyms(
            "ACM Transactions on Autonomous and Adaptive Systems"
        )
        assert "TAAS" in result

    def test_ieee_transactions_pattern(self) -> None:
        result = _generate_journal_acronyms(
            "IEEE Transactions on Knowledge and Data Engineering"
        )
        assert "TKDE" in result

    def test_international_journal_pattern(self) -> None:
        result = _generate_journal_acronyms(
            "International Journal of Cloud Applications and Computing"
        )
        assert "IJCAC" in result

    def test_journal_of_pattern(self) -> None:
        result = _generate_journal_acronyms("Journal of Computer Science")
        assert "JCS" in result

    def test_proceedings_pattern(self) -> None:
        result = _generate_journal_acronyms(
            "Proceedings of the ACM Conference on Embedded Systems"
        )
        assert any(candidate.startswith("P") for candidate in result)

    def test_acronyms_have_minimum_length_three(self) -> None:
        result = _generate_journal_acronyms("Journal of X")
        assert all(len(candidate) >= 3 for candidate in result)


class TestLooksLikeAcronym:
    """Verify the acronym-shape detection helper."""

    def test_recognizes_uppercase_short_token(self) -> None:
        assert _looks_like_acronym("TAAS") is True
        assert _looks_like_acronym("IJCAC") is True

    def test_rejects_phrases_with_spaces(self) -> None:
        assert _looks_like_acronym("Journal of Mathematics") is False

    def test_rejects_single_character(self) -> None:
        assert _looks_like_acronym("A") is False

    def test_rejects_overly_long_token(self) -> None:
        assert _looks_like_acronym("VeryLongJournalName") is False

    def test_rejects_empty_string(self) -> None:
        assert _looks_like_acronym("") is False
