"""
regulatory/versioning.py
------------------------
Handles persistence and comparison of scraped regulatory data.

Responsibilities:
- Save latest scrape results to disk (latest.json)
- Load previously saved results
- Detect new entries by comparing old vs new

Storage:
- File-based (no database)
- Location: backend/app/regulatory/data/latest.json
- Format: JSON list of dicts { title, date, link, source }

This module is standalone — it does not import scraper.py or any
other regulatory module. It is consumed by change_detector.py.
"""

import json
import logging
import os
import threading
from typing import Any

logger = logging.getLogger(__name__)

_DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")
_DATA_FILE = os.path.join(_DATA_DIR, "latest.json")
_FILE_LOCK = threading.Lock()  # Fix 7: prevent concurrent read/write corruption


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ensure_data_dir() -> None:
    """Create the data directory if it does not exist."""
    os.makedirs(_DATA_DIR, exist_ok=True)


def _is_valid_entry(item: Any) -> bool:
    """
    Return True if item is a dict with at least one of: link, title.
    Entries missing both are unusable for comparison.
    """
    if not isinstance(item, dict):
        return False
    return bool(item.get("link") or item.get("title"))


def _entry_key(item: dict) -> str:
    """
    Return the unique identifier for an entry.
    Primary: link
    Fallback: title (when link is empty/missing)
    """
    return item.get("link") or item.get("title") or ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def save_latest(data: list) -> None:
    try:
        _ensure_data_dir()
        clean      = [item for item in data if _is_valid_entry(item)]
        serialized = json.dumps(clean, ensure_ascii=False, indent=2)
        tmp_path   = _DATA_FILE + ".tmp"
        with _FILE_LOCK:  # Fix 7
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(serialized)
            os.replace(tmp_path, _DATA_FILE)
        logger.info(f"[Versioning] Saved {len(clean)} entries to {_DATA_FILE}")
    except TypeError as e:
        logger.error(f"[Versioning] Data is not JSON-serializable: {e}")
    except OSError as e:
        logger.error(f"[Versioning] File write failed: {e}")
    except Exception as e:
        logger.error(f"[Versioning] Unexpected error during save: {e}")


def load_previous() -> list:
    if not os.path.exists(_DATA_FILE):
        logger.info("[Versioning] No previous data found — first run")
        return []
    try:
        with _FILE_LOCK:  # Fix 7
            with open(_DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        if not isinstance(data, list):
            logger.warning("[Versioning] latest.json is not a list — returning []")
            return []
        logger.info(f"[Versioning] Loaded {len(data)} previous entries")
        return data
    except json.JSONDecodeError as e:
        logger.error(f"[Versioning] Corrupted JSON: {e} — returning []")
        return []
    except OSError as e:
        logger.error(f"[Versioning] Could not read latest.json: {e} — returning []")
        return []
    except Exception as e:
        logger.error(f"[Versioning] Unexpected error during load: {e} — returning []")
        return []


def detect_new_entries(old: list, new: list) -> list:
    """
    Compare old and new scrape results and return only new items.

    Comparison uses entry_key (link preferred, title as fallback).
    Items in new that have no key at all are excluded (unidentifiable).

    Args:
        old: Previously saved list of policy dicts
        new: Freshly scraped list of policy dicts

    Returns:
        List of dicts present in new but not in old.
        Returns [] if new is empty or all entries already exist.
    """
    try:
        if not new:
            logger.info("[Versioning] New data is empty — no new entries")
            return []

        # Build a set of keys from old entries for O(1) lookup
        old_keys: set[str] = set()
        for item in old:
            key = _entry_key(item)
            if key:
                old_keys.add(key)

        # Keep only new items whose key is not in old_keys
        new_entries = []
        for item in new:
            if not _is_valid_entry(item):
                continue
            key = _entry_key(item)
            if not key:
                continue
            if key not in old_keys:
                new_entries.append(item)

        logger.info(
            f"[Versioning] Comparison: {len(old)} old | {len(new)} new | "
            f"{len(new_entries)} newly detected"
        )
        return new_entries

    except Exception as e:
        logger.error(f"[Versioning] Unexpected error during comparison: {e} — returning []")
        return []
