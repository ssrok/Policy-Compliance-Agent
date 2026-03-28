from typing import Generator
from app.db.session import SessionLocal

def get_db() -> Generator:
    # ── Step 2: Session lifecycle ────────────────────────────────────────────
    # FastAPI injects this into any route that declares: db: Session = Depends(get_db)
    # A new session is opened per request and closed in the finally block
    # DEBUG: add print("DB session opened") here to trace session creation
    db = SessionLocal()
    try:
        yield db  # db is handed to the route handler
    finally:
        db.close()  # always released, even on exception
