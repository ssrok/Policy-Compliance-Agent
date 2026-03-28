"""
regulatory/scraper.py
---------------------
Fetches regulatory notifications from configurable sources (RBI, SEBI, etc.).

ALL source definitions (URLs, selectors, timeouts, user-agent, parser type)
live in sources.json — nothing is hardcoded in this file.

Returns: list of { title, date, link, source }
"""

import json
import logging
import os
from dataclasses import dataclass
from typing import Callable

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Path to config — resolved relative to this file, never hardcoded
_SOURCES_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "sources.json")


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

def _load_config() -> dict:
    """Load sources.json. Raises clearly if missing or malformed."""
    if not os.path.exists(_SOURCES_CONFIG_PATH):
        raise FileNotFoundError(
            f"Regulatory sources config not found: {_SOURCES_CONFIG_PATH}"
        )
    with open(_SOURCES_CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Parser strategies registry
# Maps the string key in sources.json → actual function
# To add a new layout: write the function, register it here
# ---------------------------------------------------------------------------

def _strategy_date_header_rows(soup: BeautifulSoup, config: "ScrapeConfig") -> list[dict]:
    """
    Pages where dates live in separate header rows above notification rows.
    Uses: item_selector, date_header_selector, title_selector, link_selector, base_url
    """
    results = []
    current_date = ""

    for row in soup.select(config.item_selector):
        date_header = row.select_one(config.date_header_selector)
        if date_header:
            current_date = date_header.get_text(strip=True)
            continue

        title = _safe_text(row, config.title_selector)
        link  = _safe_href(row, config.link_selector, config.base_url)

        if not title and not link:
            continue

        results.append({
            "title":  title,
            "date":   current_date,
            "link":   link,
            "source": config.name,
        })

    return results


def _strategy_inline_date_columns(soup: BeautifulSoup, config: "ScrapeConfig") -> list[dict]:
    """
    Pages where each row has its own date column alongside the title.
    Uses: item_selector, date_selector, title_selector, link_selector, base_url
    """
    results = []

    for row in soup.select(config.item_selector):
        title = _safe_text(row, config.title_selector)
        date  = _safe_text(row, config.date_selector)
        link  = _safe_href(row, config.link_selector, config.base_url)

        if not title and not link:
            continue

        results.append({
            "title":  title,
            "date":   date,
            "link":   link,
            "source": config.name,
        })

    return results


# Registry: sources.json "parser_strategy" value → function
STRATEGY_REGISTRY: dict[str, Callable] = {
    "date_header_rows":    _strategy_date_header_rows,
    "inline_date_columns": _strategy_inline_date_columns,
}


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _safe_text(element, selector: str) -> str:
    """Return stripped text of first matching child, or empty string."""
    if not element or not selector:
        return ""
    found = element.select_one(selector)
    return found.get_text(strip=True) if found else ""


def _safe_href(element, selector: str, base_url: str) -> str:
    """Return resolved href of first matching anchor, or empty string."""
    if not element or not selector:
        return ""
    found = element.select_one(selector)
    if not found:
        return ""
    href = found.get("href", "").strip()
    if href and not href.startswith("http"):
        href = base_url.rstrip("/") + "/" + href.lstrip("/")
    return href


# ---------------------------------------------------------------------------
# ScrapeConfig — pure data, no logic
# ---------------------------------------------------------------------------

@dataclass
class ScrapeConfig:
    name:                 str
    url:                  str
    parser_strategy:      Callable
    item_selector:        str
    title_selector:       str
    link_selector:        str
    base_url:             str
    date_selector:        str
    date_header_selector: str
    request_timeout:      int
    user_agent:           str
    html_parser:          str


# ---------------------------------------------------------------------------
# Build ScrapeConfig objects from sources.json
# ---------------------------------------------------------------------------

def _build_configs(config_data: dict) -> list[ScrapeConfig]:
    """
    Convert sources.json dict into a list of ScrapeConfig objects.
    Skips sources with enabled=false.
    Raises ValueError if a source references an unknown parser_strategy.
    """
    defaults = config_data.get("defaults", {})
    default_timeout    = defaults["request_timeout"]
    default_user_agent = defaults["user_agent"]
    default_parser     = defaults["html_parser"]

    configs = []
    for src in config_data.get("sources", []):
        if not src.get("enabled", True):
            logger.info(f"[Scraper] Skipping disabled source: {src['name']}")
            continue

        strategy_key = src["parser_strategy"]
        if strategy_key not in STRATEGY_REGISTRY:
            raise ValueError(
                f"Unknown parser_strategy '{strategy_key}' for source '{src['name']}'. "
                f"Available: {list(STRATEGY_REGISTRY.keys())}"
            )

        configs.append(ScrapeConfig(
            name=                 src["name"],
            url=                  src["url"],
            parser_strategy=      STRATEGY_REGISTRY[strategy_key],
            item_selector=        src["item_selector"],
            title_selector=       src["title_selector"],
            link_selector=        src["link_selector"],
            base_url=             src["base_url"],
            date_selector=        src.get("date_selector", ""),
            date_header_selector= src.get("date_header_selector", ""),
            request_timeout=      src.get("request_timeout", default_timeout),
            user_agent=           src.get("user_agent", default_user_agent),
            html_parser=          src.get("html_parser", default_parser),
        ))

    return configs


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_sources() -> list[ScrapeConfig]:
    """
    Load and return all enabled ScrapeConfig objects from sources.json.
    Call this to get the current source list at runtime.
    """
    config_data = _load_config()
    return _build_configs(config_data)


def fetch_source(config: ScrapeConfig) -> list[dict]:
    """
    Fetch and parse one regulatory source.
    Returns empty list on any failure — never raises.
    """
    try:
        logger.info(f"[Scraper] Fetching {config.name} → {config.url}")

        response = requests.get(
            config.url,
            timeout=config.request_timeout,
            headers={"User-Agent": config.user_agent},
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, config.html_parser)
        items = config.parser_strategy(soup, config)

        logger.info(f"[Scraper] {config.name}: {len(items)} items fetched")
        return items

    except requests.exceptions.Timeout:
        logger.warning(f"[Scraper] {config.name}: timed out after {config.request_timeout}s")
    except requests.exceptions.HTTPError as e:
        logger.warning(f"[Scraper] {config.name}: HTTP {e.response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.warning(f"[Scraper] {config.name}: network error — {e}")
    except Exception as e:
        logger.error(f"[Scraper] {config.name}: unexpected error — {e}")

    return []


def fetch_all_sources(sources: list[ScrapeConfig] = None) -> list[dict]:
    """
    Fetch from all sources. One failure never stops others.
    If sources is None, loads from sources.json automatically.
    """
    if sources is None:
        sources = load_sources()

    all_items: list[dict] = []
    for source in sources:
        all_items.extend(fetch_source(source))

    logger.info(f"[Scraper] Total across all sources: {len(all_items)} items")
    return all_items
