"""Asyncio MySQL connection pool wrapper with raw SQL helpers."""

from collections.abc import Sequence
from typing import Any

import asyncmy
from asyncmy.cursors import DictCursor

from api.settings import Settings


class Database:
    """
    Thin async wrapper around an asyncmy connection pool.

    Exposes three coroutine helpers (fetch_all, fetch_one, execute) that
    every DAO uses against raw parameterized SQL. The pool is created on
    connect() and released on disconnect(), both driven by the FastAPI
    lifespan handler so the lifecycle matches the application's.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings: Settings = settings
        self._pool: Any | None = None

    async def connect(self) -> None:
        """Open the underlying connection pool."""
        if self._pool is not None:
            return
        self._pool = await asyncmy.create_pool(
            host=self._settings.mysql_host,
            port=self._settings.mysql_port,
            user=self._settings.mysql_user,
            password=self._settings.mysql_password,
            db=self._settings.mysql_database,
            charset="utf8mb4",
            autocommit=True,
            minsize=self._settings.pool_minimum_size,
            maxsize=self._settings.pool_maximum_size,
        )

    async def disconnect(self) -> None:
        """Close the connection pool and wait for all connections to finish."""
        if self._pool is None:
            return
        self._pool.close()
        await self._pool.wait_closed()
        self._pool = None

    async def fetch_all(
        self,
        query: str,
        parameters: Sequence[Any] = (),
    ) -> list[dict[str, Any]]:
        """Execute a SELECT and return every row as a dictionary."""
        pool = self._require_pool()
        async with pool.acquire() as connection, connection.cursor(cursor=DictCursor) as cursor:
            await cursor.execute(query, parameters)
            rows = await cursor.fetchall()
            return list(rows)

    async def fetch_one(
        self,
        query: str,
        parameters: Sequence[Any] = (),
    ) -> dict[str, Any] | None:
        """Execute a SELECT and return the first row, or None if empty."""
        pool = self._require_pool()
        async with pool.acquire() as connection, connection.cursor(cursor=DictCursor) as cursor:
            await cursor.execute(query, parameters)
            row = await cursor.fetchone()
            return row if row is not None else None

    async def execute(
        self,
        query: str,
        parameters: Sequence[Any] = (),
    ) -> int:
        """Execute an INSERT/UPDATE/DELETE and return affected row count."""
        pool = self._require_pool()
        async with pool.acquire() as connection, connection.cursor(cursor=DictCursor) as cursor:
            affected = await cursor.execute(query, parameters)
            return affected

    def _require_pool(self) -> Any:
        if self._pool is None:
            raise RuntimeError("Database.connect() must be awaited before use.")
        return self._pool