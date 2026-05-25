"""RFC 7807 Problem Details error model and FastAPI exception handlers."""

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

PROBLEM_DETAIL_MEDIA_TYPE: str = "application/problem+json"


class ProblemDetail(BaseModel):
    """RFC 7807 problem details response body."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None


def _problem_response(problem: ProblemDetail) -> JSONResponse:
    return JSONResponse(
        status_code=problem.status,
        content=problem.model_dump(exclude_none=True),
        media_type=PROBLEM_DETAIL_MEDIA_TYPE,
    )


async def http_exception_handler(request: Request, exception: HTTPException) -> JSONResponse:
    """Translate FastAPI/Starlette HTTPException into a Problem Details body."""
    detail = exception.detail if isinstance(exception.detail, str) else None
    problem = ProblemDetail(
        title=_status_phrase(exception.status_code),
        status=exception.status_code,
        detail=detail,
        instance=str(request.url),
    )
    return _problem_response(problem)


async def validation_exception_handler(
    request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    """Translate Pydantic validation errors into a Problem Details body."""
    problem = ProblemDetail(
        type="https://datatracker.ietf.org/doc/html/rfc7807#section-3.1",
        title="Request validation failed",
        status=422,
        detail="; ".join(
            f"{'.'.join(str(loc) for loc in error['loc'])}: {error['msg']}"
            for error in exception.errors()
        ),
        instance=str(request.url),
    )
    return _problem_response(problem)


async def unhandled_exception_handler(request: Request, exception: Exception) -> JSONResponse:
    """Last-resort handler for any uncaught exception."""
    problem = ProblemDetail(
        title="Internal Server Error",
        status=500,
        detail=str(exception),
        instance=str(request.url),
    )
    return _problem_response(problem)


def register_error_handlers(application: FastAPI) -> None:
    """Attach all custom exception handlers to the FastAPI application."""
    application.add_exception_handler(HTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(Exception, unhandled_exception_handler)


def _status_phrase(status_code: int) -> str:
    """Return the canonical reason phrase for a known HTTP status code."""
    phrases: dict[int, str] = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
    }
    return phrases.get(status_code, "HTTP Error")
