"""Unit tests for the booktitle canonicalization function."""

import pytest

from etl.transformer import _canonicalize_booktitle


class TestCanonicalizeBooktitle:
    """Verify the booktitle to parent conference mapping."""

    def test_returns_empty_for_none(self) -> None:
        assert _canonicalize_booktitle(None) == ""

    def test_returns_empty_for_whitespace_only(self) -> None:
        assert _canonicalize_booktitle("   ") == ""

    def test_keeps_simple_acronym_unchanged(self) -> None:
        assert _canonicalize_booktitle("EDBT") == "EDBT"

    def test_strips_session_parens(self) -> None:
        assert _canonicalize_booktitle("HICSS (1)") == "HICSS"
        assert _canonicalize_booktitle("ICEIS (3-1)") == "ICEIS"

    def test_strips_volume_suffix(self) -> None:
        assert _canonicalize_booktitle("ICPP, Vol. 3") == "ICPP"
        assert _canonicalize_booktitle("CDC, volume 2") == "CDC"

    def test_strips_workshop_suffix(self) -> None:
        assert _canonicalize_booktitle("EDBT Workshops") == "EDBT"
        assert _canonicalize_booktitle("ICDE Workshop") == "ICDE"

    def test_strips_phd_workshop_suffix(self) -> None:
        assert _canonicalize_booktitle("VLDB PhD Workshop") == "VLDB"

    def test_extracts_parent_from_at_notation(self) -> None:
        assert _canonicalize_booktitle("ADMS@VLDB") == "VLDB"
        assert _canonicalize_booktitle("RSWeb@RecSys") == "RecSys"

    def test_strips_seasonal_suffix(self) -> None:
        assert _canonicalize_booktitle("VTC Spring") == "VTC"
        assert _canonicalize_booktitle("VTC Fall") == "VTC"

    def test_strips_extended_abstracts_suffix(self) -> None:
        assert _canonicalize_booktitle("CHI Extended Abstracts") == "CHI"

    def test_strips_companion_suffix(self) -> None:
        assert _canonicalize_booktitle("SIGGRAPH Companion") == "SIGGRAPH"

    def test_strips_demonstrations_suffix(self) -> None:
        assert _canonicalize_booktitle("ACL Demonstrations") == "ACL"

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("EDBT", "EDBT"),
            ("EDBT (best of volume)", "EDBT"),
            ("EDBT Workshops", "EDBT"),
            ("ADMS@VLDB", "VLDB"),
        ],
    )
    def test_known_examples_match_expected(self, raw: str, expected: str) -> None:
        assert _canonicalize_booktitle(raw) == expected

    def test_idempotent_on_already_canonical_input(self) -> None:
        once = _canonicalize_booktitle("HICSS (1)")
        twice = _canonicalize_booktitle(once)
        assert once == twice == "HICSS"
