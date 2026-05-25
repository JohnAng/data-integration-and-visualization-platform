"""Shared SQL building blocks used by every DAO.

Two patterns are used across so many list and timeseries endpoints that
extracting them keeps the DAOs short and the routing surface honest.

build_order_clause:
    Convert a user-supplied (column, direction) pair into a safe
    ``ORDER BY`` clause. The allowed dictionary is the only authority
    for which columns can be sorted on; anything outside it falls
    through to the default. Direction is whitelisted to ASC / DESC.

trim_partial_last_year:
    Yearly aggregates from DBLP exports occasionally end mid-year. The
    last bucket then carries a small fraction of a full year's data
    and produces a visible cliff in any line chart. This helper drops
    that trailing row when its count falls below ``threshold`` of the
    penultimate row's count. Computed in Python after the SQL fetch
    because the heuristic is universal and would otherwise need to be
    inlined into every materialised view.
"""

from typing import Any


def build_order_clause(
    order_by: str | None,
    order_dir: str | None,
    allowed: dict[str, str],
    default_sql: str,
) -> str:
    """Build a parameter-free ``ORDER BY`` fragment from a user request.

    Args:
        order_by: Column identifier supplied by the caller. Must appear
            as a key in ``allowed`` to be honoured; any other value
            falls back to ``default_sql``.
        order_dir: Direction supplied by the caller. ``"desc"``
            produces ``DESC``; any other value (including ``None``)
            produces ``ASC``.
        allowed: Mapping of public column identifier to safe SQL
            expression. Inverting the mapping at the DAO level keeps
            internal column names hidden from the API.
        default_sql: Raw SQL expression used when ``order_by`` is not
            in ``allowed``. Already includes the column reference and
            direction, e.g. ``"title ASC"``.

    Returns:
        A complete ``ORDER BY ...`` fragment with no leading or
        trailing whitespace, safe to interpolate after a WHERE clause.
    """
    if order_by is None or order_by not in allowed:
        return f"ORDER BY {default_sql}"
    column = allowed[order_by]
    direction = "DESC" if (order_dir or "").lower() == "desc" else "ASC"
    return f"ORDER BY {column} {direction}"


def trim_partial_last_year(
    rows: list[dict[str, Any]],
    count_key: str,
    *,
    threshold: float = 0.5,
) -> list[dict[str, Any]]:
    """Drop the trailing year of a sorted yearly aggregate when partial.

    The heuristic is identical to the one previously applied on the
    front-end. Moving it server-side honours the brief's mandate that
    "back-end data processing happens INSIDE the DBMS [or its host
    backend]" so the API serves analysis-ready timeseries without
    requiring every client to re-implement the rule.

    Args:
        rows: Sequence of dictionaries each with at least a ``year``
            key plus the count column named by ``count_key``. The
            input is treated as immutable and is sorted internally
            before the trim decision.
        count_key: Name of the column whose magnitude determines
            whether the last year is partial. Often ``articles_count``
            or ``total_articles``.
        threshold: Multiplier applied to the penultimate year's count
            to flag the last year as partial. Default 0.5 matches the
            DBLP mid-year export pattern (~17 % of the previous year
            on the 2014 dataset, well below the cutoff).

    Returns:
        A new list sorted ascending by year, with the trailing partial
        year removed when its count falls below the threshold.
        Sequences with fewer than two rows are returned unchanged.
    """
    if len(rows) < 2:
        return list(rows)
    sorted_rows = sorted(rows, key=lambda entry: entry["year"])
    last_count = sorted_rows[-1].get(count_key, 0) or 0
    penultimate_count = sorted_rows[-2].get(count_key, 0) or 0
    if penultimate_count > 0 and last_count < penultimate_count * threshold:
        return sorted_rows[:-1]
    return sorted_rows
