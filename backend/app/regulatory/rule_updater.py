"""
regulatory/rule_updater.py
--------------------------
Processes newly detected regulatory policy changes by downloading
their PDF documents and extracting clauses via the existing service layer.

Architecture:
    rule_updater → services/pdf_extractor → services/clause_segmenter
                                          (existing pipeline, untouched)

Design:
- Calls service functions directly — no HTTP, no self-calls
- Downloads PDFs to a temp file, extracts clauses, cleans up
- Processes max MAX_POLICIES_PER_RUN per call to prevent overload
- Each policy is isolated — one failure never stops others
- Standalone — does not import scraper, versioning, or change_detector
"""

import logging
import os
import tempfile

import requests

from app.services.pdf_extractor import extract_text_from_pdf
from app.services.clause_segmenter import segment_clauses

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Hard cap per run — prevents overloading the pipeline on large change batches
MAX_POLICIES_PER_RUN: int = 5

# Download timeout in seconds
_DOWNLOAD_TIMEOUT: int = 30


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _is_pdf_link(link: str) -> bool:
    """Return True if the link points to a PDF file."""
    return isinstance(link, str) and link.strip().lower().endswith(".pdf")


def download_pdf(link: str) -> bytes | None:
    """
    Download a PDF from a URL and return its raw bytes.

    Returns None on any failure — never raises.

    Args:
        link: Full URL to a PDF document.

    Returns:
        Raw PDF bytes, or None if download failed.
    """
    try:
        logger.info(f"[RuleUpdater] Downloading PDF: {link}")
        response = requests.get(
            link,
            timeout=_DOWNLOAD_TIMEOUT,
            headers={"User-Agent": "Mozilla/5.0 (PolicyComplianceAgent/1.0)"},
            allow_redirects=True,
        )
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "")
        if "pdf" not in content_type.lower() and not link.lower().endswith(".pdf"):
            logger.warning(
                f"[RuleUpdater] Unexpected content-type '{content_type}' for {link}"
            )

        logger.info(f"[RuleUpdater] Downloaded {len(response.content)} bytes from {link}")
        return response.content

    except requests.exceptions.Timeout:
        logger.warning(f"[RuleUpdater] Download timed out: {link}")
    except requests.exceptions.HTTPError as e:
        logger.warning(f"[RuleUpdater] HTTP error downloading {link}: {e}")
    except requests.exceptions.RequestException as e:
        logger.warning(f"[RuleUpdater] Network error downloading {link}: {e}")
    except Exception as e:
        logger.error(f"[RuleUpdater] Unexpected error downloading {link}: {e}")

    return None


def send_to_policy_pipeline(pdf_bytes: bytes, title: str) -> list[str]:
    """
    Extract clauses from PDF bytes using the existing service layer directly.

    Flow:
        pdf_bytes → temp file on disk
        → extract_text_from_pdf(temp_path)
        → segment_clauses(raw_text)
        → list of clause strings

    Temp file is always cleaned up regardless of success or failure.

    Args:
        pdf_bytes: Raw bytes of a downloaded PDF.
        title:     Used only for logging context.

    Returns:
        List of extracted clause strings. Empty list on any failure.
    """
    tmp_path = None
    try:
        # Write bytes to a named temp file so pdf_extractor can open it by path
        with tempfile.NamedTemporaryFile(
            suffix=".pdf", delete=False
        ) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        logger.info(f"[RuleUpdater] Extracting text from PDF for: {title}")
        raw_text = extract_text_from_pdf(tmp_path)

        if not raw_text or not raw_text.strip():
            logger.warning(f"[RuleUpdater] No text extracted from PDF: {title}")
            return []

        logger.info(f"[RuleUpdater] Segmenting clauses for: {title}")
        clauses = segment_clauses(raw_text)

        logger.info(f"[RuleUpdater] {len(clauses)} clauses extracted for: {title}")
        return clauses

    except Exception as e:
        logger.error(f"[RuleUpdater] Pipeline error for '{title}': {e}")
        return []

    finally:
        # Always clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError as e:
                logger.warning(f"[RuleUpdater] Could not delete temp file {tmp_path}: {e}")


def process_single_policy(change: dict) -> dict:
    """
    Process one detected change entry end-to-end.

    Steps:
        1. Validate link presence
        2. Check link is a PDF
        3. Download PDF bytes
        4. Extract clauses via service layer
        5. Return result dict

    Args:
        change: A classified change dict from change_detector.detect_changes()

    Returns:
        Result dict:
        {
            title, status, reason, rules_generated,
            actionable: bool
                True  → PDF was downloaded and clauses extracted (auto-ingested)
                False → link was non-PDF or missing (detected but not processed)
        }

    actionable flag allows the frontend and downstream modules to distinguish:
        actionable=True  → "Auto-ingested"
        actionable=False → "Detected but not processed"
    """
    title = change.get("title", "Unknown")
    link  = change.get("link",  "").strip()

    # Step 1: Validate link
    if not link:
        logger.info(f"[RuleUpdater] Skipping '{title}' — no link")
        return {
            "title":           title,
            "status":          "skipped",
            "reason":          "No link available",
            "rules_generated": 0,
            "actionable":      False,
        }

    # Step 2: Check PDF
    # Non-PDF links (HTML press release pages) are informational only.
    # They are detected and classified but cannot be auto-ingested.
    # actionable=False signals to frontend: "Detected but not processed"
    if not _is_pdf_link(link):
        logger.info(f"[RuleUpdater] Skipping '{title}' — not a PDF link")
        return {
            "title":           title,
            "status":          "skipped",
            "reason":          "non_pdf_link",
            "rules_generated": 0,
            "actionable":      False,
        }

    # Step 3: Download
    pdf_bytes = download_pdf(link)
    if pdf_bytes is None:
        return {
            "title":           title,
            "status":          "failed",
            "reason":          "PDF download failed",
            "rules_generated": 0,
            "actionable":      False,
        }

    # Step 4: Extract clauses
    clauses = send_to_policy_pipeline(pdf_bytes, title)
    if not clauses:
        return {
            "title":           title,
            "status":          "failed",
            "reason":          "No clauses extracted from PDF",
            "rules_generated": 0,
            "actionable":      False,
        }

    # Step 5: Success — PDF downloaded and clauses extracted
    # actionable=True signals to frontend: "Auto-ingested"
    return {
        "title":           title,
        "status":          "processed",
        "reason":          f"{len(clauses)} clauses extracted successfully",
        "rules_generated": len(clauses),
        "actionable":      True,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def process_new_policies(changes: list) -> list:
    """
    Process a batch of newly detected regulatory changes.

    - Caps processing at MAX_POLICIES_PER_RUN (default 5) per call
    - Each policy is processed independently — one failure never stops others
    - Non-PDF and missing-link entries are skipped gracefully
    - Never raises

    Args:
        changes: List of classified change dicts from change_detector.detect_changes()

    Returns:
        List of result dicts:
        { title, status, reason, rules_generated, actionable }
        Entries beyond MAX_POLICIES_PER_RUN are appended with status "skipped".
    """
    if not changes:
        logger.info("[RuleUpdater] Empty input — nothing to process")
        return []

    results = []
    capped  = changes[:MAX_POLICIES_PER_RUN]
    skipped = changes[MAX_POLICIES_PER_RUN:]

    logger.info(
        f"[RuleUpdater] Processing {len(capped)} of {len(changes)} changes "
        f"(cap={MAX_POLICIES_PER_RUN})"
    )

    for change in capped:
        try:
            result = process_single_policy(change)
            results.append(result)
        except Exception as e:
            logger.error(f"[RuleUpdater] Unexpected error on entry: {e} — marking failed")
            results.append({
                "title":           change.get("title", "Unknown"),
                "status":          "failed",
                "reason":          f"Unexpected error: {e}",
                "rules_generated": 0,
                "actionable":      False,
            })

    # Entries beyond cap — mark as skipped, not actionable
    for change in skipped:
        results.append({
            "title":           change.get("title", "Unknown"),
            "status":          "skipped",
            "reason":          "Exceeded per-run processing cap",
            "rules_generated": 0,
            "actionable":      False,
        })

    processed = sum(1 for r in results if r["status"] == "processed")
    failed    = sum(1 for r in results if r["status"] == "failed")
    skipped_n = sum(1 for r in results if r["status"] == "skipped")

    logger.info(
        f"[RuleUpdater] Done — processed={processed} "
        f"failed={failed} skipped={skipped_n}"
    )
    return results
