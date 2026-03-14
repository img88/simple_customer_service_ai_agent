from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings, loaded from .env file or environment variables.
    """

    GEMINI_API_KEY: str
    EMBEDDING_MODEL: str = "text-embedding-004"
    LLM_MODEL: str = "gemini-1.5-flash"
    DATABASE_URL: str = "sqlite:///./data/database.db"
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
