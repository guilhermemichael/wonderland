import os
from pathlib import Path
from dotenv import load_dotenv

# Load root .env if present
root_dir = Path(__file__).resolve().parent.parent.parent
dotenv_path = root_dir / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
_database_url = os.getenv("DATABASE_URL")
if APP_ENV == "production" and not _database_url:
    raise RuntimeError("DATABASE_URL is required when APP_ENV=production")

DATABASE_URL = _database_url or "postgresql+psycopg://wonderland:wonderland_dev_password@localhost:5432/wonderland"
API_CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "API_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://wonderland-ochre.vercel.app",
    ).split(",")
    if origin.strip()
]
API_TITLE = "WONDERLAND API"
API_VERSION = "0.2.0"
DEFAULT_CAMPAIGN_SLUG = "wonderland"
DEFAULT_CAMPAIGN_NAME = "WONDERLAND — Follow the White Rabbit"
SESSION_EXPIRATION_HOURS = int(os.getenv("SESSION_EXPIRATION_HOURS", "72"))
