from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CONVERSION_", env_file=".env")

    redis_url: str = "redis://redis:6379/1"
    queue_name: str = "office-conversions"
    data_dir: Path = Path("/data/conversions")
    libreoffice_binary: str = "soffice"
    max_upload_mb: int = 50
    conversion_timeout_seconds: int = 120
    cleanup_retention_hours: int = 24
    allowed_extensions: set[str] = {"docx", "xlsx", "pptx"}

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def output_dir(self) -> Path:
        return self.data_dir / "outputs"

    @property
    def job_dir(self) -> Path:
        return self.data_dir / "jobs"

    @property
    def tmp_dir(self) -> Path:
        return self.data_dir / "tmp"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    for directory in (settings.upload_dir, settings.output_dir, settings.job_dir, settings.tmp_dir):
        directory.mkdir(parents=True, exist_ok=True)
    return settings
