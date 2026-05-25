"""Configuration for the backup and restore command-line utilities."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent
ENVIRONMENT_FILE: Path = REPOSITORY_ROOT / ".env"
DEFAULT_BACKUP_PATH: Path = REPOSITORY_ROOT / "deliverables" / "db_backup.sql.gz"


class BackupSettings(BaseSettings):
    """
    Strongly-typed configuration for backup and restore operations.

    These commands need the Docker container name plus root credentials
    privileged enough to dump every table and load every CREATE statement
    back. They intentionally use a different credential surface than the
    application's runtime API user.
    """

    container_name: str = Field(..., alias="MYSQL_CONTAINER_NAME")
    database_name: str = Field(..., alias="MYSQL_DATABASE")
    root_password: str = Field(..., alias="MYSQL_ROOT_PASSWORD")

    model_config = SettingsConfigDict(
        env_file=ENVIRONMENT_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


def get_backup_settings() -> BackupSettings:
    """Construct a fresh BackupSettings instance from the current environment."""
    return BackupSettings()
