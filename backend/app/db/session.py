from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# ── Step 1: Connection ────────────────────────────────────────────────────────
# DATABASE_URL is read from backend/.env
# Format: postgresql://user:password@host:5432/postgres
# Supabase uses a connection pooler URL (aws-*.pooler.supabase.com:5432)
# sslmode=require is mandatory for Supabase connections
# echo=True prints every SQL statement to the terminal — useful for debugging
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 5
    },
    pool_pre_ping=True,  # tests connection health before each use
    echo=True            # DEBUG: remove in production to silence SQL logs
)

# SessionLocal is a factory — each request gets its own session via get_db()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
