from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate

def create_user(db: Session, user_data: UserCreate):
    # ── INSERT into `users` table ─────────────────────────────────────────
    # Data shape: { email: str }  (id and created_at are DB-generated)
    # DEBUG: print("Inserting user:", user_data.email)
    db_user = User(email=user_data.email)
    db.add(db_user)      # stages the INSERT in the session
    db.commit()          # flushes to Supabase — actual SQL: INSERT INTO users (email) VALUES (...)
    db.refresh(db_user)  # re-reads the row to populate id and created_at
    return db_user

def get_all_users(db: Session):
    return db.query(User).all()  # SELECT * FROM users
