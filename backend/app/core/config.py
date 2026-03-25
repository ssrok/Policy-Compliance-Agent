import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# BASE_DIR = backend/ folder, .env lives here
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BACKEND_DIR, ".env")
load_dotenv(env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Policy Compliance Agent"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    # Database Configuration
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")
    # OpenAI
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    
    # Upload configuration
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    
    class Config:
        env_file = env_path
        case_sensitive = True
        extra = "ignore"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
