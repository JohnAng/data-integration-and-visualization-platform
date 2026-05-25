"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import Database
from api.errors import register_error_handlers
from api.routers import authors, charts, conferences, journals, meta, years
from api.settings import Settings, get_settings


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Connect the database pool on startup and tear it down on shutdown."""
    settings: Settings = get_settings()
    database = Database(settings)
    await database.connect()
    application.state.database = database
    application.state.settings = settings
    try:
        yield
    finally:
        await database.disconnect()


def create_application() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    settings = get_settings()
    application = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    register_error_handlers(application)

    application.include_router(meta.router)
    application.include_router(journals.router)
    application.include_router(conferences.router)
    application.include_router(years.router)
    application.include_router(authors.router)
    application.include_router(charts.router)

    @application.get("/health", tags=["meta"])
    async def health_check() -> dict[str, str]:
        """Liveness probe for orchestration and uptime monitors."""
        return {"status": "ok"}

    return application


application = create_application()