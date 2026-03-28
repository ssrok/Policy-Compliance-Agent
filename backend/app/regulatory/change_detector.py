"""
regulatory/change_detector.py
------------------------------
Classifies newly detected regulatory entries into meaningful change types.

Design:
- Pure logic — no external API, no DB, no file I/O
- Rule-based keyword classification using CLASSIFICATION_RULES constant
- Keyword extraction using STOPWORDS constant
- Standalone — does not import scraper.py or versioning.py
- Consumed by rule_updater.py and API layer

Input:  list of { title, date, link, source }
Output: list of { title, link, source, change_type, confidence, keywords }
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants — classification rules and stopwords
# Modify these to extend classification coverage
# ---------------------------------------------------------------------------

# Maps change_type → list of keyword triggers
# Each keyword is matched case-insensitively against the entry title
# Order matters: first match wins
CLASSIFICATION_RULES: dict[str, list[str]] = {
    "THRESHOLD_UPDATE": [
        "threshold", "limit", "amount", "ceiling", "cap",
        "maximum", "minimum", "floor", "value", "lakh", "crore",
    ],
    "KYC_UPDATE": [
        "kyc", "know your customer", "customer due diligence",
        "cdd", "identity", "identification", "verification",
    ],
    "AML_UPDATE": [
        "aml", "anti-money laundering", "money laundering",
        "financial crime", "suspicious transaction",
        "suspicious activity", "fatf", "pmla",
    ],
    "NEW_POLICY": [
        "regulation", "circular", "directive", "guideline",
        "framework", "policy", "act", "notification", "master circular",
        "press release", "issuance",
    ],
}

# Stopwords removed before keyword extraction
STOPWORDS: set[str] = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall",
    "its", "it", "this", "that", "these", "those", "as", "up",
    "into", "about", "than", "more", "also", "not", "no", "new",
    "under", "over", "per", "all", "any", "each", "both", "between",
}

# Confidence levels
_CONFIDENCE_EXACT   = 0.9   # keyword found as whole word
_CONFIDENCE_PARTIAL = 0.7   # keyword found as substring
_CONFIDENCE_DEFAULT = 0.5   # no keyword matched


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    """Lowercase and strip extra whitespace from text."""
    return re.sub(r"\s+", " ", text.lower().strip())


def _classify_title(title: str) -> tuple[str, float, list[str]]:
    """
    Classify a title string against CLASSIFICATION_RULES.

    Returns:
        (change_type, confidence, matched_keywords)

    Matching tiers:
        1. Exact word match  → confidence 0.9
        2. Substring match   → confidence 0.7
        3. No match          → change_type "OTHER", confidence 0.5
    """
    normalised = _normalise(title)

    for change_type, keywords in CLASSIFICATION_RULES.items():
        exact_hits    = []
        partial_hits  = []

        for kw in keywords:
            kw_lower = kw.lower()
            # Exact word boundary match
            if re.search(rf"\b{re.escape(kw_lower)}\b", normalised):
                exact_hits.append(kw_lower)
            # Substring match (catches compound words / partial phrases)
            elif kw_lower in normalised:
                partial_hits.append(kw_lower)

        if exact_hits:
            return change_type, _CONFIDENCE_EXACT, exact_hits
        if partial_hits:
            return change_type, _CONFIDENCE_PARTIAL, partial_hits

    return "OTHER", _CONFIDENCE_DEFAULT, []


def _extract_keywords(title: str) -> list[str]:
    """
    Extract top meaningful keywords from a title.

    Steps:
    1. Lowercase and tokenise on non-alphanumeric characters
    2. Remove stopwords and single-character tokens
    3. Remove duplicates while preserving order
    4. Return up to 5 tokens

    Returns:
        List of 0–5 keyword strings.
    """
    tokens = re.split(r"[^a-z0-9]+", _normalise(title))
    seen   = set()
    result = []

    for token in tokens:
        if len(token) < 2:
            continue
        if token in STOPWORDS:
            continue
        if token in seen:
            continue
        seen.add(token)
        result.append(token)
        if len(result) == 5:
            break

    return result


def _process_entry(entry: dict[str, Any]) -> dict[str, Any] | None:
    """
    Process a single entry dict into a classified change record.

    Returns None if the entry is missing a usable title.
    """
    title = entry.get("title", "").strip()
    if not title:
        logger.warning("[ChangeDetector] Skipping entry with missing title")
        return None

    change_type, confidence, matched_kws = _classify_title(title)
    keywords = _extract_keywords(title)

    # Merge matched classification keywords into extracted keywords (deduplicated)
    for kw in matched_kws:
        if kw not in keywords:
            keywords.append(kw)

    return {
        "title":       title,
        "link":        entry.get("link", ""),
        "source":      entry.get("source", ""),
        "date":        entry.get("date", ""),
        "change_type": change_type,
        "confidence":  confidence,
        "keywords":    keywords[:5],
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_changes(new_entries: list) -> list:
    """
    Classify a list of newly detected regulatory entries.

    - Skips entries with missing titles
    - Handles duplicates safely (processes all, caller deduplicates if needed)
    - Never raises — returns [] on any unexpected failure

    Args:
        new_entries: List of policy dicts from versioning.detect_new_entries()

    Returns:
        List of classified change dicts:
        {
            title, link, source, date,
            change_type, confidence, keywords
        }
    """
    if not new_entries:
        logger.info("[ChangeDetector] Empty input — returning []")
        return []

    results = []

    for entry in new_entries:
        try:
            processed = _process_entry(entry)
            if processed is not None:
                results.append(processed)
        except Exception as e:
            logger.error(f"[ChangeDetector] Failed to process entry: {e} — skipping")
            continue

    logger.info(
        f"[ChangeDetector] Processed {len(new_entries)} entries "
        f"→ {len(results)} classified"
    )
    return results
