"""
Produce a compressed mysqldump backup of the mye030 database.

The script streams the raw mysqldump output through Python's gzip module
straight into deliverables/db_backup.sql.gz, so the full uncompressed
dump never has to live on disk. Restore the resulting file with
db_restore.py.

Run from src/backend/ as::

    uv run python -m database.db_backup
"""

import gzip
import subprocess
import sys
import time
from pathlib import Path

from database.docker_runtime import ensure_container_running
from database.settings import DEFAULT_BACKUP_PATH, get_backup_settings

CHUNK_SIZE: int = 65536


def stream_dump_to_gzip(
    container_name: str,
    database_name: str,
    root_password: str,
    output_path: Path,
) -> tuple[int, int]:
    """
    Stream a mysqldump from the container straight into a gzip file.

    Returns a tuple of (raw_bytes, compressed_bytes) for reporting.
    Raises RuntimeError if mysqldump exits non-zero.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    raw_bytes: int = 0

    dump_command = [
        "docker", "exec", "-i", container_name,
        "mysqldump",
        "-u", "root", f"-p{root_password}",
        "--single-transaction",
        "--quick",
        "--routines",
        "--triggers",
        "--default-character-set=utf8mb4",
        database_name,
    ]

    with (
        subprocess.Popen(dump_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process,
        gzip.open(output_path, "wb", compresslevel=9) as gzip_writer,
    ):
        if process.stdout is None:
            raise RuntimeError("Could not open mysqldump stdout pipe")
        while chunk := process.stdout.read(CHUNK_SIZE):
            gzip_writer.write(chunk)
            raw_bytes += len(chunk)
        error_output = process.stderr.read() if process.stderr is not None else b""
        process.wait()
        if process.returncode != 0:
            raise RuntimeError(
                f"mysqldump failed (exit {process.returncode}): "
                f"{error_output.decode('utf-8', errors='replace').strip()}"
            )

    return raw_bytes, output_path.stat().st_size


def main() -> int:
    """Take a compressed mysqldump backup into the deliverables directory."""
    settings = get_backup_settings()
    output_path = DEFAULT_BACKUP_PATH

    print(f"Backing up database '{settings.database_name}' from container '{settings.container_name}'")
    ensure_container_running(settings.container_name)

    started_at = time.perf_counter()
    raw_bytes, compressed_bytes = stream_dump_to_gzip(
        settings.container_name,
        settings.database_name,
        settings.root_password,
        output_path,
    )
    duration_seconds = time.perf_counter() - started_at

    raw_mib = raw_bytes / (1024 * 1024)
    compressed_mib = compressed_bytes / (1024 * 1024)
    ratio_percent = (compressed_bytes / raw_bytes) * 100 if raw_bytes else 0.0

    print(f"  raw SQL produced     {raw_mib:>8.2f} MiB")
    print(f"  compressed written   {compressed_mib:>8.2f} MiB ({ratio_percent:.1f}% of raw)")
    print(f"  output path          {output_path}")
    print(f"  elapsed              {duration_seconds:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
