"""
regulatory/scheduler.py
------------------------
Orchestrates the full Regulatory Intelligence pipeline and runs it
periodically in a background thread.

Pipeline order (per run):
    1. scraper.fetch_all_sources()          — fetch latest from RBI/SEBI
    2. versioning.load_previous()           — load last saved snapshot
    3. versioning.detect_new_entries()      — diff old vs new
    4. change_detector.detect_changes()     — classify new entries
    5. rule_updater.process_new_policies()  — attempt PDF ingestion
    6. notification_manager.add_notifications() — store alerts
    7. versioning.save_latest()             — persist new snapshot

Interval priority:
    1. Argument passed to start_scheduler()
    2. settings.REGULATORY_CHECK_INTERVAL_MINUTES  (from .env)
    3. Hardcoded fallback: 60 minutes

Design:
- Runs in a daemon thread — stops automatically when main process exits
- Single pipeline run is always wrapped in try/except — never crashes app
- Only one scheduler thread allowed at a time (guarded by _scheduler_lock)
- Standalone — all pipeline modules imported here, nowhere else
"""

import logging
import threading
import time
from typing import Optional

from app.core.config import settings
from app.regulatory.scraper          import fetch_all_sources
from app.regulatory.versioning       import load_previous, detect_new_entries, save_latest
from app.regulatory.change_detector  import detect_changes
from app.regulatory.rule_updater     import process_new_policies
from app.regulatory.notifications    import notification_manager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DEFAULT_INTERVAL_MINUTES: int = 60   # final fallback if env not set

# ---------------------------------------------------------------------------
# Scheduler state — module-level, shared across threads
# ---------------------------------------------------------------------------

_scheduler_thread: Optional[threading.Thread] = None
_scheduler_lock   = threading.Lock()
_stop_event       = threading.Event()

# Tracks last run metadata — readable by API status endpoint
_last_run_status: dict = {
    "last_run_at":       None,   # ISO timestamp string
    "last_run_result":   None,   # "success" | "failed" | "no_changes"
    "new_entries_found": 0,
    "notifications_added": 0,
    "error":             None,
}


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def run_regulatory_pipeline() -> dict:
    """
    Execute the full Regulatory Intelligence pipeline once.

    Steps:
        1. Fetch latest policies from all sources
        2. Load previous snapshot
        3. Detect new entries (diff)
        4. Classify changes
        5. Process PDFs via rule updater
        6. Push notifications
        7. Save new snapshot

    Returns:
        Summary dict:
        {
            fetched:              int,
            new_entries:          int,
            changes_classified:   int,
            notifications_added:  int,
            processed:            int,
            skipped:              int,
            failed:               int,
        }

    Never raises — all errors are caught and logged.
    """
    summary = {
        "fetched":             0,
        "new_entries":         0,
        "changes_classified":  0,
        "notifications_added": 0,
        "processed":           0,
        "skipped":             0,
        "failed":              0,
    }

    try:
        logger.info("[Scheduler] Pipeline run starting")

        # Step 1: Fetch
        data = fetch_all_sources()
        summary["fetched"] = len(data)
        logger.info(f"[Scheduler] Step 1 — Fetched {len(data)} items")

        if not data:
            logger.warning("[Scheduler] No data fetched — aborting run")
            return summary

        # Step 2: Load previous
        old = load_previous()
        logger.info(f"[Scheduler] Step 2 — Loaded {len(old)} previous entries")

        # Step 3: Detect new entries
        new_entries = detect_new_entries(old, data)
        summary["new_entries"] = len(new_entries)
        logger.info(f"[Scheduler] Step 3 — {len(new_entries)} new entries detected")

        if not new_entries:
            logger.info("[Scheduler] No new entries — saving snapshot and exiting")
            save_latest(data)
            return summary

        # Step 4: Classify changes
        changes = detect_changes(new_entries)
        summary["changes_classified"] = len(changes)
        logger.info(f"[Scheduler] Step 4 — {len(changes)} changes classified")

        # Step 5: Process policies (PDF ingestion)
        results = process_new_policies(changes)
        summary["processed"] = sum(1 for r in results if r["status"] == "processed")
        summary["skipped"]   = sum(1 for r in results if r["status"] == "skipped")
        summary["failed"]    = sum(1 for r in results if r["status"] == "failed")
        logger.info(
            f"[Scheduler] Step 5 — processed={summary['processed']} "
            f"skipped={summary['skipped']} failed={summary['failed']}"
        )

        # Step 6: Notifications
        added = notification_manager.add_notifications(changes)
        summary["notifications_added"] = added
        logger.info(f"[Scheduler] Step 6 — {added} notifications added")

        # Step 7: Save snapshot
        save_latest(data)
        logger.info("[Scheduler] Step 7 — Snapshot saved")

        logger.info(f"[Scheduler] Pipeline run complete: {summary}")

    except Exception as e:
        logger.error(f"[Scheduler] Pipeline run failed: {e}")
        summary["error"] = str(e)

    return summary


# ---------------------------------------------------------------------------
# Scheduler loop
# ---------------------------------------------------------------------------

def _resolve_interval(interval_minutes: Optional[int]) -> int:
    """
    Resolve the interval using priority order:
        1. Function argument (if provided and valid)
        2. settings.REGULATORY_CHECK_INTERVAL_MINUTES (from .env)
        3. _DEFAULT_INTERVAL_MINUTES (60)
    """
    if interval_minutes is not None:
        try:
            val = int(interval_minutes)
            if val > 0:
                return val
            logger.warning(
                f"[Scheduler] Invalid interval_minutes={interval_minutes} "
                f"— falling back to settings"
            )
        except (TypeError, ValueError):
            logger.warning(
                f"[Scheduler] Non-integer interval_minutes={interval_minutes} "
                f"— falling back to settings"
            )

    env_val = getattr(settings, "REGULATORY_CHECK_INTERVAL_MINUTES", None)
    if env_val is not None:
        try:
            val = int(env_val)
            if val > 0:
                return val
        except (TypeError, ValueError):
            pass

    return _DEFAULT_INTERVAL_MINUTES


def _scheduler_loop(interval_minutes: int, stop_event: threading.Event) -> None:
    """
    Background loop: run pipeline, sleep, repeat until stop_event is set.

    Args:
        interval_minutes: Seconds between runs (already resolved).
        stop_event:       Set this to stop the loop cleanly.
    """
    interval_seconds = interval_minutes * 60
    logger.info(
        f"[Scheduler] Background thread started — "
        f"interval={interval_minutes}min ({interval_seconds}s)"
    )

    while not stop_event.is_set():
        from datetime import datetime, timezone

        run_start = datetime.now(timezone.utc).isoformat()
        logger.info(f"[Scheduler] Run starting at {run_start}")

        summary = run_regulatory_pipeline()

        # Update shared status
        _last_run_status["last_run_at"]         = run_start
        _last_run_status["new_entries_found"]   = summary.get("new_entries", 0)
        _last_run_status["notifications_added"] = summary.get("notifications_added", 0)
        _last_run_status["error"]               = summary.get("error")
        _last_run_status["last_run_result"] = (
            "failed"     if summary.get("error") else
            "no_changes" if summary.get("new_entries", 0) == 0 else
            "success"
        )

        logger.info(
            f"[Scheduler] Sleeping {interval_minutes}min until next run"
        )

        # Sleep in small increments so stop_event is checked frequently
        for _ in range(interval_seconds):
            if stop_event.is_set():
                break
            time.sleep(1)

    logger.info("[Scheduler] Background thread stopped")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def start_scheduler(interval_minutes: Optional[int] = None) -> None:
    """
    Start the regulatory pipeline scheduler in a background daemon thread.

    Interval resolution priority:
        1. interval_minutes argument
        2. settings.REGULATORY_CHECK_INTERVAL_MINUTES (.env)
        3. Default: 60 minutes

    Only one scheduler thread runs at a time. Calling start_scheduler()
    again while already running has no effect.

    Args:
        interval_minutes: Override interval in minutes. None = use env/default.
    """
    global _scheduler_thread, _stop_event

    with _scheduler_lock:
        if _scheduler_thread is not None and _scheduler_thread.is_alive():
            logger.warning("[Scheduler] Already running — ignoring start request")
            return

        resolved = _resolve_interval(interval_minutes)
        logger.info(f"[Scheduler] Starting with interval={resolved}min")

        _stop_event = threading.Event()
        _scheduler_thread = threading.Thread(
            target=_scheduler_loop,
            args=(resolved, _stop_event),
            daemon=True,
            name="RegulatoryScheduler",
        )
        _scheduler_thread.start()
        logger.info("[Scheduler] Background thread launched")


def stop_scheduler() -> None:
    """
    Signal the scheduler thread to stop after its current sleep cycle.
    Returns immediately — does not block until thread exits.
    """
    global _stop_event
    if _stop_event is not None:
        _stop_event.set()
        logger.info("[Scheduler] Stop signal sent")
    else:
        logger.info("[Scheduler] No active scheduler to stop")


def get_scheduler_status() -> dict:
    """
    Return current scheduler state and last run metadata.

    Returns:
        {
            running:             bool,
            interval_minutes:    int,
            last_run_at:         str | None,
            last_run_result:     str | None,
            new_entries_found:   int,
            notifications_added: int,
            error:               str | None,
        }
    """
    running = (
        _scheduler_thread is not None and
        _scheduler_thread.is_alive()
    )
    return {
        "running":             running,
        "interval_minutes":    getattr(settings, "REGULATORY_CHECK_INTERVAL_MINUTES", _DEFAULT_INTERVAL_MINUTES),
        **_last_run_status,
    }
