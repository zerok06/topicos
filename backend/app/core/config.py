from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]

class Settings(BaseSettings):
    # Aplicación
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    secret_key: str
    demo_mode: bool = True
    demo_role_header: str = "X-Demo-Role"

    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Database
    database_url_central: str
    database_url_sede: str
    database_url_retail: str
    database_url_supply: str

    # Keycloak
    keycloak_enabled: bool = False
    keycloak_url: str = "http://localhost:8080"
    keycloak_realm: str = "nike"
    keycloak_client_id: str = "nike-backend"
    keycloak_client_secret: str = ""
    keycloak_algorithm: str = "RS256"

    # Groq API (LLM del chatbot)
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.1-8b-instant"
    groq_max_tokens: int = 2048
    groq_temperature: float = 0.3

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore

settings = get_settings()
