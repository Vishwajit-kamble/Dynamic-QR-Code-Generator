import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the backend directory
base_dir = Path(__file__).resolve().parent
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"
    PORT = int(os.getenv("PORT", 5000))
    SECRET_KEY = os.getenv("SECRET_KEY", "tapreview_default_dev_secret_key_2026")
    TIMEZONE = os.getenv("TIMEZONE", "Asia/Kolkata")

    # Admin Auth
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tapreview.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminTapReview2026!")

    # Public Redirect Base URL
    PUBLIC_REDIRECT_BASE_URL = os.getenv("PUBLIC_REDIRECT_BASE_URL", f"http://localhost:{PORT}").rstrip("/")

    # Supabase Credentials
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    # CORS
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if origin.strip()]

    # Paths
    BASE_DIR = base_dir
    PROJECT_ROOT = base_dir.parent
    QR_OUTPUT_DIR = PROJECT_ROOT / "qr_codes"
    PRODUCTION_EXPORTS_DIR = PROJECT_ROOT / "production_exports"
    SQLITE_DB_PATH = base_dir / "database" / "tapreview.db"

    @classmethod
    def is_supabase_configured(cls) -> bool:
        return bool(cls.SUPABASE_URL and cls.SUPABASE_SERVICE_KEY)

