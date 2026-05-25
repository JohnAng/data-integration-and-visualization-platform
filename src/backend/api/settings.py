"""Application settings loaded from environment variables."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPOSITORY_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent
ENVIRONMENT_FILE: Path = REPOSITORY_ROOT / ".env"


class Settings(BaseSettings):
    """
    Strongly-typed configuration for the API.

    Values are loaded from the repository-level .env file and then
    overridden by any matching environment variable, so the same code
    works locally, in docker-compose, and in CI without changes.
    """

    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = Field(..., alias="MYSQL_USER")
    mysql_password: str = Field(..., alias="MYSQL_PASSWORD")
    mysql_database: str = Field(..., alias="MYSQL_DATABASE")

    pool_minimum_size: int = 2
    pool_maximum_size: int = 10

    api_title: str = "MYE030 Data Integration & Visualization API"
    api_version: str = "0.1.0"

    model_config = SettingsConfigDict(
        env_file=ENVIRONMENT_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


def get_settings() -> Settings:
    """Construct a fresh Settings instance from the current environment."""
    return Settings()
