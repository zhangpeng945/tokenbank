from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "TokenBank"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://tokenbank:tokenbank_dev@localhost:5432/tokenbank"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440

    # Encryption (Fernet key for provider API keys)
    encryption_key: str = ""

    # Token Bank defaults
    default_credit_limit: int = 10000
    default_interest_rate: float = 0.0001
    default_debt_interest_rate: float = 0.0005

    # Proxy
    proxy_max_retries: int = 3
    proxy_upstream_timeout: int = 120

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
