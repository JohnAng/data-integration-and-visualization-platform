"""Helpers for interacting with the MySQL Docker container."""

import subprocess


class ContainerNotRunningError(RuntimeError):
    """Raised when the target container is missing or not in 'running' state."""


def ensure_container_running(container_name: str) -> None:
    """
    Verify that the requested Docker container exists and is running.

    Raises ContainerNotRunningError with an actionable message if the
    container is missing, exited, or the Docker daemon is unreachable.
    """
    result = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Status}}", container_name],
        capture_output=True,
        text=True,
        check=False,
    )
    status = result.stdout.strip()
    if result.returncode != 0 or status != "running":
        message = (
            f"Container '{container_name}' is not running (status: {status or 'missing'}). "
            f"Start it with 'docker compose up -d' before retrying."
        )
        raise ContainerNotRunningError(message)
