from pathlib import Path

from pydantic import Field, SecretStr, model_validator

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict
)


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):

    APP_NAME: str = "DBAdmin"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    APP_HOST: str = "127.0.0.1"

    APP_PORT: int = Field(
        default=8000,
        ge=1,
        le=65535
    )

    STORAGE_PATH: Path = Path("storage")

    DB_PATH: Path = Path(
        "storage/dbadmin.db"
    )

    DB_CONNECT_TIMEOUT: int = Field(
        default=5,
        gt=0
    )

    QUERY_TIMEOUT_MS: int = Field(
        default=10000,
        gt=0
    )

    MAX_QUERY_ROWS: int = Field(
        default=1000,
        gt=0
    )

    POOL_MIN_SIZE: int = Field(
        default=1,
        ge=1
    )

    POOL_MAX_SIZE: int = Field(
        default=5,
        ge=1
    )

    POOL_TIMEOUT: int = Field(
        default=5,
        gt=0
    )

    ALLOWED_NETWORKS: str = "127.0.0.0/8"

    FRONTEND_URL: str = "http://localhost:5173"

    ENCRYPTION_KEY: SecretStr = Field(
        min_length=1
    )

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8"
    )

    @model_validator(mode="after")
    def validate_pool(self):

        if self.POOL_MIN_SIZE > self.POOL_MAX_SIZE:

            raise ValueError(
                "POOL_MIN_SIZE no puede superar POOL_MAX_SIZE"
            )

        return self

    @property
    def database_path(self) -> Path:

        return BASE_DIR / self.DB_PATH

    @property
    def storage_path(self) -> Path:

        return BASE_DIR / self.STORAGE_PATH

    @property
    def backup_path(self) -> Path:

        return self.storage_path / "backups"

    @property
    def allowed_networks(self) -> tuple[str, ...]:

        return tuple(
            network.strip()
            for network in self.ALLOWED_NETWORKS.split(",")
            if network.strip()
        )