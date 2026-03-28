"""
api/routes/regulatory_routes.py
---------------------------------
REST API endpoints for the Regulatory Intelligence Layer.

All routes are under /api/v1/regulatory (prefix set in main.py).

Endpoints:
    GET    /status           — scheduler state + last run metadata
    POST   /run              — trigger pipeline once manually
    GET    /notifications    — retrieve stored notifications
    DELETE /notifications    — clear all notifications
    POST   /start            — start background scheduler
    POST   /stop             — stop background scheduler

Design:
- No DB usage
- No blocking calls in route handlers
- run_regulatory_pipeline() is the only potentially slow call (POST /run)
  and is run in a thread pool via FastAPI's run_in_threadpool
"""

import logging
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from app.regulatory.scheduler import (
    run_regulatory_pipeline,
    start_scheduler,
    stop_scheduler,
    get_scheduler_status,
)
from app.regulatory.notifications import notification_manager

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /status
# ---------------------------------------------------------------------------

@router.get("/status")
async def get_status():
    """
    Return current scheduler state and last pipeline run metadata.

    Response:
    {
        "running":             bool,
        "interval_minutes":    int,
        "last_run_at":         str | null,
        "last_run_result":     "success" | "no_changes" | "failed" | null,
        "new_entries_found":   int,
        "notifications_added": int,
        "error":               str | null,
        "notifications_count": int
    }
    """
    status = get_scheduler_status()
    status["notifications_count"] = notification_manager.count()
    return status


# ---------------------------------------------------------------------------
# POST /run
# ---------------------------------------------------------------------------

@router.post("/run")
async def trigger_run():
    """
    Manually trigger one full pipeline run.

    Runs in thread pool to avoid blocking the event loop.

    Response:
    {
        "status":              "completed",
        "fetched":             int,
        "new_entries":         int,
        "changes_classified":  int,
        "notifications_added": int,
        "processed":           int,
        "skipped":             int,
        "failed":              int,
        "error":               str | null
    }
    """
    logger.info("[RegulatoryAPI] Manual pipeline run triggered")
    summary = await run_in_threadpool(run_regulatory_pipeline)
    return {"status": "completed", **summary}


# ---------------------------------------------------------------------------
# GET /notifications
# ---------------------------------------------------------------------------

@router.get("/notifications")
async def get_notifications():
    """
    Return all stored notifications, newest first.

    Response:
    {
        "count": int,
        "notifications": [
            {
                "title":       str,
                "source":      str,
                "change_type": str,
                "actionable":  bool,
                "timestamp":   str,
                "message":     str
            }
        ]
    }
    """
    notifications = notification_manager.get_notifications()
    return {
        "count":         len(notifications),
        "notifications": notifications,
    }


# ---------------------------------------------------------------------------
# DELETE /notifications
# ---------------------------------------------------------------------------

@router.delete("/notifications")
async def clear_notifications():
    """
    Clear all stored notifications.

    Response:
    {
        "status":  "cleared",
        "message": "All notifications cleared"
    }
    """
    notification_manager.clear_notifications()
    logger.info("[RegulatoryAPI] Notifications cleared via API")
    return {
        "status":  "cleared",
        "message": "All notifications cleared",
    }


# ---------------------------------------------------------------------------
# POST /start
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_scheduler_endpoint(interval_minutes: int = None):
    """
    Start the background scheduler.

    Query param:
        interval_minutes (optional) — override interval in minutes.
        If omitted, uses settings.REGULATORY_CHECK_INTERVAL_MINUTES or default 60.

    Response:
    {
        "status":           "started" | "already_running",
        "interval_minutes": int
    }
    """
    status_before = get_scheduler_status()

    if status_before["running"]:
        logger.info("[RegulatoryAPI] Scheduler already running")
        return {
            "status":           "already_running",
            "interval_minutes": status_before["interval_minutes"],
        }

    start_scheduler(interval_minutes=interval_minutes)
    status_after = get_scheduler_status()
    logger.info(f"[RegulatoryAPI] Scheduler started via API — interval={status_after['interval_minutes']}min")
    return {
        "status":           "started",
        "interval_minutes": status_after["interval_minutes"],
    }


# ---------------------------------------------------------------------------
# POST /stop
# ---------------------------------------------------------------------------

@router.post("/stop")
async def stop_scheduler_endpoint():
    """
    Stop the background scheduler.

    Response:
    {
        "status":  "stopped" | "not_running",
        "message": str
    }
    """
    status_before = get_scheduler_status()

    if not status_before["running"]:
        logger.info("[RegulatoryAPI] Stop called but scheduler not running")
        return {
            "status":  "not_running",
            "message": "Scheduler was not running",
        }

    stop_scheduler()
    logger.info("[RegulatoryAPI] Scheduler stopped via API")
    return {
        "status":  "stopped",
        "message": "Scheduler stop signal sent",
    }
