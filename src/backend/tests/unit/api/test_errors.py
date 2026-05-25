"""Unit tests for the RFC 7807 problem details helpers."""

from api.errors import PROBLEM_DETAIL_MEDIA_TYPE, ProblemDetail, _status_phrase


class TestProblemDetail:
    """ProblemDetail serializes to the documented Problem Details shape."""

    def test_defaults_type_to_about_blank(self) -> None:
        problem = ProblemDetail(title="Bad", status=400)
        dumped = problem.model_dump()
        assert dumped["type"] == "about:blank"

    def test_omits_none_fields_when_excluded(self) -> None:
        problem = ProblemDetail(title="Not Found", status=404)
        dumped = problem.model_dump(exclude_none=True)
        assert "detail" not in dumped
        assert "instance" not in dumped

    def test_carries_detail_and_instance(self) -> None:
        problem = ProblemDetail(
            title="Not Found",
            status=404,
            detail="Journal 42 missing",
            instance="/api/journals/42",
        )
        dumped = problem.model_dump()
        assert dumped["detail"] == "Journal 42 missing"
        assert dumped["instance"] == "/api/journals/42"


class TestStatusPhrase:
    """The status-to-phrase mapping covers the codes the API actually emits."""

    def test_returns_canonical_phrase_for_known_status(self) -> None:
        assert _status_phrase(404) == "Not Found"
        assert _status_phrase(400) == "Bad Request"
        assert _status_phrase(422) == "Unprocessable Entity"
        assert _status_phrase(500) == "Internal Server Error"

    def test_falls_back_to_generic_phrase_for_unknown_status(self) -> None:
        assert _status_phrase(418) == "HTTP Error"


def test_media_type_is_rfc_7807_compliant() -> None:
    assert PROBLEM_DETAIL_MEDIA_TYPE == "application/problem+json"
