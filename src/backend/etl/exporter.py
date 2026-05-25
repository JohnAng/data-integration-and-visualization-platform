"""
ETL exporter — serialise the transformed Polars frames to CSV.

The Polars-side pipeline ends here: every DataFrame produced by
``etl.transformer.DataTransformer`` is written out as a CSV that
matches the column order declared by the matching ``CREATE TABLE``
in ``sql_scripts/01_schema.sql``. The CSVs land under
``<repo_root>/exports/`` and are picked up by ``LOAD DATA LOCAL
INFILE`` in ``sql_scripts/02_load.sql``.

Run as::

    uv run python -m etl.exporter

Set ``ETL_SAMPLE_ROWS`` to limit the DBLP intake when iterating on
the transform logic — useful for fast feedback.
"""

import os
import time
from pathlib import Path

import polars as pl

from etl.transformer import DataTransformer


class DataExporter:
    """
    Executes the final stage of the Python side of the ETL pipeline.

    Serializes each transformed Polars DataFrame to a CSV file in the
    repository-level exports directory. The CSVs are formatted to be
    consumed by the SQL LOAD DATA LOCAL INFILE statements declared in
    sql_scripts/02_load.sql.
    """

    def __init__(self, output_dir: str = "exports") -> None:
        """
        Initialize the exporter and ensure the target directory exists.
        """
        self.output_path = Path(__file__).resolve().parent.parent.parent.parent / output_dir
        self.output_path.mkdir(parents=True, exist_ok=True)

    def export_datasets(self, datasets: dict[str, pl.DataFrame]) -> None:
        """
        Iterate the dataset dictionary and serialize each frame to a CSV.

        Uses Polars-default quoting (only when necessary) and the standard
        MySQL null sentinel ``\\N`` so that LOAD DATA INFILE materializes
        NULLs correctly into nullable columns.
        """
        for table_name, dataframe in datasets.items():
            file_path = self.output_path / f"{table_name}.csv"
            dataframe.write_csv(
                file_path,
                separator=",",
                quote_char='"',
                null_value="\\N",
                line_terminator="\n",
            )


if __name__ == "__main__":
    sample_environment_variable = os.environ.get("ETL_SAMPLE_ROWS")
    sample_rows = int(sample_environment_variable) if sample_environment_variable else None

    transform_started_at = time.perf_counter()
    transformer = DataTransformer(sample_rows=sample_rows)
    datasets = transformer.transform_all()
    transform_duration_seconds = time.perf_counter() - transform_started_at

    export_started_at = time.perf_counter()
    DataExporter().export_datasets(datasets)
    export_duration_seconds = time.perf_counter() - export_started_at

    label = f"sample={sample_rows}" if sample_rows else "full"
    print(f"\nETL transform completed in {transform_duration_seconds:.2f}s ({label})")
    print(f"CSV export completed in    {export_duration_seconds:.2f}s\n")
    print("=== Match statistics ===")
    for statistic_name, statistic_value in transformer.match_stats.items():
        print(f"  {statistic_name:30s} {statistic_value}")
    print("\n=== Output table sizes ===")
    for table_name, dataframe in datasets.items():
        print(f"  {table_name:34s} rows={dataframe.height:>10d}  cols={dataframe.width:>3d}")
