import os
from urllib.parse import unquote
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Resolve all paths from this file's absolute location
_THIS_FILE   = os.path.abspath(__file__)               # .../app/core/config.py
_APP_DIR     = os.path.dirname(os.path.dirname(_THIS_FILE))   # .../app/
_BACKEND_DIR = os.path.dirname(_APP_DIR)               # .../backend/
_BASE_DIR    = os.path.dirname(_BACKEND_DIR)            # .../Policy-Compliance-Agent/

env_path = os.path.join(_BACKEND_DIR, ".env")

# Load with override=True so subprocess always picks up fresh values
load_dotenv(dotenv_path=env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Policy Compliance Agent"
    API_V1_STR:   str = "/api/v1"

    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    DATABASE_URL:   str | None = None
    OPENAI_API_KEY: str | None = None
    GROQ_API_KEY:   str | None = None
    UPLOAD_DIR:     str = os.path.join(_BASE_DIR, "uploads")
    RAG_INDEX_DIR:  str = os.path.join(_BACKEND_DIR, "rag_index")

    model_config = {
        "env_file":          env_path,
        "env_file_encoding": "utf-8",
        "case_sensitive":    True,
        "extra":             "ignore",
    }

settings = Settings()

# Decode URL-encoded characters in DATABASE_URL (e.g. %25 → %)
if settings.DATABASE_URL:
    settings.DATABASE_URL = unquote(settings.DATABASE_URL)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.RAG_INDEX_DIR, exist_ok=True)
