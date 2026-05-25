"""FastAPI dependency providers."""

from fastapi import Request

from api.database import Database


def get_database(request: Request) -> Database:
    """Return the Database singleton stored on the application state."""
    database: Database = request.app.state.database
    return database