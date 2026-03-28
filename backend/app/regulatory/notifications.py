"""
regulatory/notifications.py
----------------------------
In-memory + DB-backed notification system for the Regulatory Intelligence Layer.

On add  : writes to both in-memory list AND PostgreSQL (survives restarts).
On start: lazy-loads existing notifications from DB into memory on first access.
"""

import logging
import threading
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

MAX_NOTIFICATIONS: int = 200

_MESSAGE_TEMPLATES: dict[str, str] = {
    "THRESHOLD_UPDATE": "Transaction threshold updated in {source} policy",
    "KYC_UPDATE":       "KYC norms updated by {source}",
    "AML_UPDATE":       "AML guidelines revised by {source}",
    "NEW_POLICY":       "New regulatory policy detected from {source}",
    "OTHER":            "New regulatory update detected from {source}",
}
_DEFAULT_MESSAGE = "New regulatory update detected from {source}"


def _build_message(change_type: str, source: str) -> str:
    template = _MESSAGE_TEMPLATES.get(change_type, _DEFAULT_MESSAGE)
    return template.format(source=source or "Unknown")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_duplicate(existing: list[dict], notification: dict) -> bool:
    for n in existing:
        if (
            n.get("title")       == notification.get("title") and
            n.get("source")      == notification.get("source") and
            n.get("change_type") == notification.get("change_type")
        ):
            return True
    return False


def _format_notification(change: dict[str, Any]) -> dict | None:
    title       = change.get("title",       "").strip()
    source      = change.get("source",      "").strip()
    change_type = change.get("change_type", "OTHER").strip() or "OTHER"
    actionable  = bool(change.get("actionable", False))
    link        = change.get("link", "").strip()   # Fix 1: preserve link

    if not title and not source:
        logger.warning("[Notifications] Skipping entry with no title and no source")
        return None

    return {
        "title":       title or "Untitled",
        "source":      source or "Unknown",
        "change_type": change_type,
        "actionable":  actionable,
        "link":        link,                        # Fix 1: include link
        "timestamp":   _utc_now(),
        "message":     _build_message(change_type, source),
    }


def _save_to_db(notification: dict) -> None:
    """Persist a single notification to PostgreSQL. Never raises."""
    try:
        from app.db.session import SessionLocal
        from app.models.notification import Notification
        db = SessionLocal()
        try:
            db.add(Notification(
                title       = notification["title"],
                source      = notification["source"],
                change_type = notification["change_type"],
                actionable  = notification["actionable"],
                link        = notification.get("link", ""),   # Fix 2: save link
                message     = notification["message"],
            ))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"[Notifications] DB persist failed: {e}")


def _load_from_db() -> list[dict]:
    """Load all notifications from DB ordered oldest first. Never raises."""
    try:
        from app.db.session import SessionLocal
        from app.models.notification import Notification
        db = SessionLocal()
        try:
            rows = db.query(Notification).order_by(Notification.created_at.asc()).all()
            return [
                {
                    "id":          r.id,
                    "title":       r.title,
                    "source":      r.source,
                    "change_type": r.change_type,
                    "actionable":  r.actionable,
                    "link":        r.link or "",    # Fix 2: load link
                    "timestamp":   r.created_at.isoformat() if r.created_at else _utc_now(),
                    "message":     r.message,
                }
                for r in rows
            ]
        finally:
            db.close()
    except Exception as e:
        logger.error(f"[Notifications] DB load failed: {e}")
        return []


class NotificationManager:
    def __init__(self, max_size: int = MAX_NOTIFICATIONS):
        self._notifications: list[dict] = []
        self._lock = threading.Lock()
        self._max_size = max_size
        self._db_loaded = False

    def _ensure_loaded(self) -> None:
        """Lazy-load from DB on first access."""
        if not self._db_loaded:
            persisted = _load_from_db()
            if persisted:
                self._notifications = persisted[-self._max_size:]
                logger.info(f"[Notifications] Loaded {len(self._notifications)} from DB")
            self._db_loaded = True

    def add_notifications(self, changes: list) -> int:
        if not changes:
            return 0
        added = 0
        try:
            with self._lock:
                self._ensure_loaded()
                for change in changes:
                    try:
                        notification = _format_notification(change)
                        if notification is None:
                            continue
                        if _is_duplicate(self._notifications, notification):
                            continue
                        if len(self._notifications) >= self._max_size:
                            self._notifications.pop(0)
                        self._notifications.append(notification)
                        added += 1
                        _save_to_db(notification)
                    except Exception as e:
                        logger.error(f"[Notifications] Failed to process entry: {e}")
        except Exception as e:
            logger.error(f"[Notifications] Unexpected error: {e}")
        logger.info(f"[Notifications] Added {added} of {len(changes)} (total: {len(self._notifications)})")
        return added

    def get_notifications(self) -> list:
        try:
            with self._lock:
                self._ensure_loaded()
                return list(reversed(self._notifications))
        except Exception as e:
            logger.error(f"[Notifications] Error in get_notifications: {e}")
            return []

    def clear_notifications(self) -> None:
        try:
            with self._lock:
                count = len(self._notifications)
                self._notifications.clear()
                self._db_loaded = True
            try:
                from app.db.session import SessionLocal
                from app.models.notification import Notification
                db = SessionLocal()
                try:
                    db.query(Notification).delete()
                    db.commit()
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"[Notifications] DB clear failed: {e}")
            logger.info(f"[Notifications] Cleared {count} notifications")
        except Exception as e:
            logger.error(f"[Notifications] Error in clear_notifications: {e}")

    def count(self) -> int:
        with self._lock:
            self._ensure_loaded()
            return len(self._notifications)


# Module-level singleton
notification_manager = NotificationManager()
