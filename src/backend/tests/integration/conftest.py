"""Pytest configuration for integration tests against a real MySQL container.

The fixtures here drop and recreate a dedicated ``mye030_test`` database,
apply the production schema, load a small deterministic seed, and expose
both a Database wrapper and a Settings instance pointing at it.
"""

from collections.abc import AsyncGenerator
from pathlib import Path

import asyncmy
import pytest_asyncio

from api.database import Database
from api.settings import Settings

REPOSITORY_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent.parent
SQL_SCRIPTS_DIRECTORY: Path = REPOSITORY_ROOT / "sql_scripts"
FIXTURE_DIRECTORY: Path = Path(__file__).parent / "fixtures"

TEST_DATABASE_NAME: str = "mye030_test"
TEST_ROOT_USER: str = "root"
TEST_ROOT_PASSWORD: str = "root"
TEST_HOST: str = "localhost"
TEST_PORT: int = 3306


def _statements_from_file(file_path: Path) -> list[str]:
    """Split a SQL file into executable statements ignoring blank/comment lines."""
    contents = file_path.read_text(encoding="utf-8")
    cleaned_lines: list[str] = []
    for raw_line in contents.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        cleaned_lines.append(raw_line)
    sql_body = "\n".join(cleaned_lines)
    return [statement.strip() for statement in sql_body.split(";") if statement.strip()]


async def _execute_script(connection: asyncmy.Connection, file_path: Path) -> None:
    """Run every non-trivial statement from a .sql file using the open connection."""
    async with connection.cursor() as cursor:
        for statement in _statements_from_file(file_path):
            await cursor.execute(statement)


async def _bootstrap_test_database() -> None:
    """Recreate the test database and apply schema, fixture seed, and views."""
    bootstrap_connection = await asyncmy.connect(
        host=TEST_HOST,
        port=TEST_PORT,
        user=TEST_ROOT_USER,
        password=TEST_ROOT_PASSWORD,
        autocommit=True,
        charset="utf8mb4",
    )
    try:
        async with bootstrap_connection.cursor() as cursor:
            await cursor.execute(f"DROP DATABASE IF EXISTS {TEST_DATABASE_NAME}")
            await cursor.execute(
                f"CREATE DATABASE {TEST_DATABASE_NAME} "
                "DEFAULT CHARACTER SET utf8mb4 "
                "DEFAULT COLLATE utf8mb4_unicode_ci"
            )
    finally:
        await bootstrap_connection.ensure_closed()

    setup_connection = await asyncmy.connect(
        host=TEST_HOST,
        port=TEST_PORT,
        user=TEST_ROOT_USER,
        password=TEST_ROOT_PASSWORD,
        db=TEST_DATABASE_NAME,
        autocommit=True,
        charset="utf8mb4",
    )
    try:
        schema_statements = _statements_from_file(SQL_SCRIPTS_DIRECTORY / "01_schema.sql")
        async with setup_connection.cursor() as cursor:
            for statement in schema_statements:
                if statement.upper().startswith(("CREATE DATABASE", "USE")):
                    continue
                await cursor.execute(statement)

        await _execute_script(setup_connection, FIXTURE_DIRECTORY / "seed.sql")

        view_statements = _statements_from_file(SQL_SCRIPTS_DIRECTORY / "03_views.sql")
        async with setup_connection.cursor() as cursor:
            for statement in view_statements:
                if statement.upper().startswith("USE"):
                    continue
                await cursor.execute(statement)
    finally:
        await setup_connection.ensure_closed()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def test_settings() -> Settings:
    """Construct a Settings instance pointing at the test database."""
    return Settings(
        MYSQL_USER=TEST_ROOT_USER,
        MYSQL_PASSWORD=TEST_ROOT_PASSWORD,
        MYSQL_DATABASE=TEST_DATABASE_NAME,
        mysql_host=TEST_HOST,
        mysql_port=TEST_PORT,
        pool_minimum_size=1,
        pool_maximum_size=3,
    )


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def database(test_settings: Settings) -> AsyncGenerator[Database]:
    """Bootstrap the test database and yield a connected Database wrapper."""
    await _bootstrap_test_database()
    database_wrapper = Database(test_settings)
    await database_wrapper.connect()
    try:
        yield database_wrapper
    finally:
        await database_wrapper.disconnect()
