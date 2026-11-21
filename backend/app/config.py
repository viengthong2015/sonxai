from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Sonxai School CMS"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://postgres:dhis2@localhost:5432/sonxai1"

    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cookie_name: str = "sonxai_session"
    cookie_secure: bool = False

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    upload_dir: Path = BASE_DIR / "uploads"
    max_upload_mb: int = 5

    frontend_dist: Path = BASE_DIR.parent / "frontend" / "dist"

    initial_admin_username: str = "admin"
    initial_admin_password: str | None = None

    @field_validator("secret_key")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if not v or v == "change-me" or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be set to a random string of at least 32 characters "
                "(see backend/.env.example)."
            )
        return v

    @property
    def is_dev(self) -> bool:
        return self.environment.lower() in {"dev", "development", "local"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
