"""
Restore the mye030 database from a compressed mysqldump backup.

Pipes deliverables/db_backup.sql.gz through Python's gzip module into
the mysql client running inside the Docker container. The target
database must already exist (it is normally created by 01_schema.sql or
by the container's bootstrap entry-point); this command repopulates it
in place.

Run from src/backend/ as::

    uv run python -m database.db_restore
"""

import gzip
import subprocess
import sys
import time
from pathlib import Path

from database.docker_runtime import ensure_container_running
from database.settings import DEFAULT_BACKUP_PATH, get_backup_settings

CHUNK_SIZE: int = 65536


def stream_gzip_into_mysql(
    container_name: str,
    database_name: str,
    root_password: str,
    input_path: Path,
) -> int:
    """
    Pipe the decompressed contents of a gzipped SQL dump into mysql.

    Returns the number of decompressed bytes that were streamed in.
    Raises RuntimeError if the mysql client exits non-zero.
    """
    if not input_path.exists():
        raise FileNotFoundError(f"Backup file not found at {input_path}")

    bytes_streamed: int = 0

    restore_command = [
        "docker", "exec", "-i", container_name,
        "mysql",
        "-u", "root", f"-p{root_password}",
        "--default-character-set=utf8mb4",
        database_name,
    ]

    with (
        gzip.open(input_path, "rb") as gzip_reader,
        subprocess.Popen(restore_command, stdin=subprocess.PIPE, stderr=subprocess.PIPE) as process,
    ):
        if process.stdin is None:
            raise RuntimeError("Could not open mysql client stdin pipe")
        while chunk := gzip_reader.read(CHUNK_SIZE):
            process.stdin.write(chunk)
            bytes_streamed += len(chunk)
        process.stdin.close()
        error_output = process.stderr.read() if process.stderr is not None else b""
        process.wait()
        if process.returncode != 0:
            raise RuntimeError(
                f"mysql restore failed (exit {process.returncode}): "
                f"{error_output.decode('utf-8', errors='replace').strip()}"
            )

    return bytes_streamed


def main() -> int:
    """Restore the database from the default deliverables backup path."""
    settings = get_backup_settings()
    input_path = DEFAULT_BACKUP_PATH

    print(f"Restoring database '{settings.database_name}' into container '{settings.container_name}'")
    print(f"  source path          {input_path}")
    ensure_container_running(settings.container_name)

    started_at = time.perf_counter()
    bytes_streamed = stream_gzip_into_mysql(
        settings.container_name,
        settings.database_name,
        settings.root_password,
        input_path,
    )
    duration_seconds = time.perf_counter() - started_at

    decompressed_mib = bytes_streamed / (1024 * 1024)
    print(f"  decompressed SQL     {decompressed_mib:>8.2f} MiB streamed in")
    print(f"  elapsed              {duration_seconds:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
