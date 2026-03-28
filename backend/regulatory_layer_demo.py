"""
regulatory_layer_demo.py
=========================
Demonstrates EVERY component of the Regulatory Layer running end-to-end.

PHASE 1 - Scraper         : Fetch live data from RBI + SEBI
PHASE 2 - Versioning      : Diff against previous snapshot, detect new entries
PHASE 3 - Change Detector : Classify each entry (KYC/AML/THRESHOLD/NEW_POLICY)
PHASE 4 - Rule Updater    : Auto-download PDFs and extract clauses
PHASE 5 - LLM Extraction  : OpenAI extracts structured rules from clauses
PHASE 6 - Notifications   : Push all changes into notification_manager
PHASE 7 - Snapshot Save   : Persist latest.json for future diff runs
PHASE 8 - Scheduler Demo  : Show background auto-scheduler starting/stopping

Usage (from backend/ directory, venv active):
    python regulatory_layer_demo.py

To see notifications on the frontend Bell icon after this runs:
    Invoke-WebRequest -Uri http://localhost:8000/api/v1/regulatory/run -Method POST
"""

import sys
import os
import time
import json
import logging
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")

BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_ROOT, ".env"))

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s - %(message)s")

W = 65

def header(t):  print(f"\n{'=' * W}\n  {t}\n{'=' * W}")
def phase(n, t): print(f"\n{'-' * W}\n  PHASE {n}: {t}\n{'-' * W}")
def ok(m):   print(f"  [OK]  {m}")
def info(m): print(f"  [>>]  {m}")
def warn(m): print(f"  [!!]  {m}")
def item(m): print(f"        {m}")


# ============================================================
# PHASE 1 - SCRAPER
# ============================================================

def phase1_scrape():
    phase(1, "SCRAPER - Fetch live data from RBI + SEBI")
    from app.regulatory.scraper import fetch_all_sources, load_sources

    sources = load_sources()
    info(f"Sources configured: {[s.name for s in sources]}")

    data = fetch_all_sources(sources)
    ok(f"Total items fetched: {len(data)}")

    counts = {}
    for d in data:
        src = d.get("source", "unknown")
        counts[src] = counts.get(src, 0) + 1
    for src, count in counts.items():
        item(f"{src:<25} {count} items")

    print()
    info("Sample entries (first 3):")
    for d in data[:3]:
        item(f"[{d.get('source')}] {d.get('title', '')[:70]}")
        item(f"  date: {d.get('date', 'N/A')}  link: {d.get('link', 'N/A')[:60]}")

    return data


# ============================================================
# PHASE 2 - VERSIONING
# ============================================================

def phase2_versioning(data):
    phase(2, "VERSIONING - Diff against previous snapshot")
    from app.regulatory.versioning import load_previous, detect_new_entries

    old = load_previous()
    if len(old) == 0:
        info("No previous snapshot - first run, all items treated as NEW")
    else:
        ok(f"Loaded {len(old)} entries from latest.json")

    new_entries = detect_new_entries(old, data)
    ok(f"New entries detected: {len(new_entries)} (out of {len(data)} fetched)")

    if new_entries:
        info("First 3 new entries:")
        for e in new_entries[:3]:
            item(f"[{e.get('source')}] {e.get('title', '')[:70]}")

    return new_entries


# ============================================================
# PHASE 3 - CHANGE DETECTOR
# ============================================================

def phase3_classify(new_entries):
    phase(3, "CHANGE DETECTOR - Classify each new entry")
    from app.regulatory.change_detector import detect_changes

    if not new_entries:
        warn("No new entries to classify - skipping")
        return []

    changes = detect_changes(new_entries)
    ok(f"Classified {len(changes)} entries")

    type_counts = {}
    for c in changes:
        ct = c.get("change_type", "OTHER")
        type_counts[ct] = type_counts.get(ct, 0) + 1

    print()
    info("Classification breakdown:")
    for ct, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        item(f"{ct:<22} {count} items")

    print()
    info("Sample classifications with confidence + keywords:")
    for c in changes[:5]:
        item(f"[{c['change_type']}] conf={c['confidence']}  kw={c['keywords']}")
        item(f"  title: {c['title'][:65]}")

    return changes


# ============================================================
# PHASE 4 - RULE UPDATER
# ============================================================

def phase4_rule_updater(changes):
    phase(4, "RULE UPDATER - Auto-download PDFs and extract clauses")
    from app.regulatory.rule_updater import (
        process_new_policies, _is_pdf_link, download_pdf, send_to_policy_pipeline
    )

    if not changes:
        warn("No changes to process - skipping")
        return [], []

    pdf_entries  = [c for c in changes if _is_pdf_link(c.get("link", ""))]
    html_entries = [c for c in changes if not _is_pdf_link(c.get("link", ""))]

    info(f"Entries with direct PDF links : {len(pdf_entries)}")
    info(f"Entries with HTML/no links    : {len(html_entries)} (detected, not auto-ingested)")

    if pdf_entries:
        info("PDF entries found:")
        for e in pdf_entries[:5]:
            item(f"  {e['title'][:65]}")
            item(f"  {e['link'][:65]}")

    print()
    info("Running process_new_policies() ...")
    results = process_new_policies(changes)

    processed = [r for r in results if r["status"] == "processed"]
    skipped   = [r for r in results if r["status"] == "skipped"]
    failed    = [r for r in results if r["status"] == "failed"]

    ok(f"processed={len(processed)}  skipped={len(skipped)}  failed={len(failed)}")

    if processed:
        print()
        ok("Auto-ingested PDFs:")
        for r in processed:
            item(f"  {r['title'][:65]}")
            item(f"  clauses extracted: {r['rules_generated']}")

    if failed:
        print()
        warn("Failed entries:")
        for r in failed:
            item(f"  {r['title'][:65]} -> {r['reason']}")

    extracted_clauses = []
    if pdf_entries:
        print()
        info("DEMO: Manually downloading first PDF and extracting clauses ...")
        first_pdf = pdf_entries[0]
        item(f"Title : {first_pdf['title'][:65]}")
        item(f"Link  : {first_pdf['link'][:65]}")

        pdf_bytes = download_pdf(first_pdf["link"])
        if pdf_bytes:
            ok(f"Downloaded {len(pdf_bytes):,} bytes")
            clauses = send_to_policy_pipeline(pdf_bytes, first_pdf["title"])
            ok(f"Extracted {len(clauses)} clauses")
            if clauses:
                print()
                info("First 5 extracted clauses:")
                for i, cl in enumerate(clauses[:5], 1):
                    item(f"  [{i}] {cl[:100]}")
            extracted_clauses = clauses
        else:
            warn("PDF download failed")
    else:
        warn("No direct PDF links in this batch")
        warn("RBI/SEBI publish HTML pages, not direct .pdf links")
        warn("When a .pdf link appears it will be auto-ingested here")

    return results, extracted_clauses


# ============================================================
# PHASE 5 - LLM EXTRACTION
# ============================================================

def phase5_llm_extraction(clauses):
    phase(5, "LLM EXTRACTION - OpenAI extracts structured rules from clauses")

    try:
        from app.services.llm_extractor import extract_rules_from_clauses
    except Exception as e:
        warn(f"LLM extractor import failed: {e}")
        warn("Check: pip install openai  and  OPENAI_API_KEY in .env")
        return []

    if not clauses:
        warn("No clauses available - this phase runs when PDFs are ingested in Phase 4")
        info("Example of what LLM extraction produces:")
        example = {
            "entity": "transaction", "field": "amount",
            "operator": ">", "value": 10000,
            "action": "report",
            "source_clause": "All transactions exceeding Rs. 10,000 must be reported."
        }
        item(json.dumps(example, indent=4))
        return []

    info(f"Running LLM extraction on {min(len(clauses), 5)} clauses ...")
    try:
        rules = extract_rules_from_clauses(clauses[:5])
        ok(f"Extracted {len(rules)} structured rules")
        print()
        info("Extracted rules:")
        for i, rule in enumerate(rules, 1):
            item(f"Rule {i}:")
            for k, v in rule.items():
                if k != "source_clause":
                    item(f"    {k:<12} : {v}")
            item(f"    {'source':<12} : {rule.get('source_clause', '')[:80]}")
        return rules
    except Exception as e:
        warn(f"LLM extraction failed: {e}")
        warn("Check OPENAI_API_KEY in .env")
        return []


# ============================================================
# PHASE 6 - NOTIFICATIONS
# ============================================================

def phase6_notifications(changes, processed_results):
    phase(6, "NOTIFICATIONS - Push changes into notification_manager")
    from app.regulatory.notifications import notification_manager

    if not changes:
        warn("No changes - no notifications to add")
        return 0

    actionable_titles = {r["title"] for r in processed_results if r["status"] == "processed"}
    for c in changes:
        c["actionable"] = c.get("title", "") in actionable_titles

    before = notification_manager.count()
    added  = notification_manager.add_notifications(changes)
    after  = notification_manager.count()

    ok(f"Notifications added   : {added}")
    ok(f"Total stored in memory: {after} (was {before})")

    all_notifs = notification_manager.get_notifications()
    type_counts = {}
    for n in all_notifs:
        ct = n.get("change_type", "OTHER")
        type_counts[ct] = type_counts.get(ct, 0) + 1

    print()
    info("Notification breakdown by type:")
    for ct, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        item(f"{ct:<22} {count}")

    print()
    info("Latest 5 notifications:")
    for n in all_notifs[:5]:
        item(f"[{n['change_type']}] {n['title'][:60]}")
        item(f"  source={n['source']}  actionable={n['actionable']}")
        item(f"  msg: {n['message']}")

    return added


# ============================================================
# PHASE 7 - SNAPSHOT SAVE
# ============================================================

def phase7_save_snapshot(data):
    phase(7, "VERSIONING - Save new snapshot to latest.json")
    from app.regulatory.versioning import save_latest

    save_latest(data)

    data_path = os.path.join(BACKEND_ROOT, "app", "regulatory", "data", "latest.json")
    if os.path.exists(data_path):
        size_kb = os.path.getsize(data_path) / 1024
        ok(f"Saved {len(data)} entries ({size_kb:.1f} KB)")
        ok(f"Path: {data_path}")
        info("Next run diffs against this - only genuinely new items trigger notifications")
    else:
        warn("Snapshot file not found after save")


# ============================================================
# PHASE 8 - SCHEDULER DEMO
# ============================================================

def phase8_scheduler_demo():
    phase(8, "SCHEDULER - Background auto-scheduler demonstration")
    from app.regulatory.scheduler import start_scheduler, stop_scheduler, get_scheduler_status

    info("Scheduler runs the full pipeline automatically in a background thread")
    info("Interval from .env: REGULATORY_CHECK_INTERVAL_MINUTES=720")
    print()

    status = get_scheduler_status()
    info(f"Currently running   : {status['running']}")
    info(f"Interval            : {status['interval_minutes']} minutes")
    info(f"Last run at         : {status['last_run_at'] or 'Never'}")
    info(f"Last result         : {status['last_run_result'] or 'N/A'}")
    info(f"New entries found   : {status['new_entries_found']}")
    info(f"Notifications added : {status['notifications_added']}")

    print()
    info("Starting scheduler for a 5-second demo ...")
    start_scheduler(interval_minutes=1)
    time.sleep(2)

    status = get_scheduler_status()
    ok(f"Scheduler running: {status['running']}")
    ok(f"Background thread alive - watching RBI/SEBI every {status['interval_minutes']} min")

    info("Stopping scheduler ...")
    stop_scheduler()
    time.sleep(1)

    status = get_scheduler_status()
    ok(f"Scheduler stopped: {not status['running']}")
    print()
    info("In production (uvicorn), use these API endpoints:")
    item("POST http://localhost:8000/api/v1/regulatory/start   - start auto-scheduler")
    item("POST http://localhost:8000/api/v1/regulatory/stop    - stop auto-scheduler")
    item("GET  http://localhost:8000/api/v1/regulatory/status  - check status")
    item("POST http://localhost:8000/api/v1/regulatory/run     - trigger one run now")


# ============================================================
# PHASE 9 - PUSH TO LIVE BACKEND
# ============================================================

def phase9_push_to_backend():
    phase(9, "PUSH TO LIVE BACKEND - Trigger pipeline inside uvicorn")
    import urllib.request
    import urllib.error

    info("This script runs in its own process.")
    info("To make notifications appear on the frontend Bell icon,")
    info("we now delete the snapshot and call the live backend API.")
    print()

    # Step 1: Delete snapshot so backend sees all items as new
    snapshot_path = os.path.join(BACKEND_ROOT, "app", "regulatory", "data", "latest.json")
    if os.path.exists(snapshot_path):
        os.remove(snapshot_path)
        ok("Deleted latest.json so backend treats all items as new")

    # Step 2: Call POST /api/v1/regulatory/run on the live server
    url = "http://localhost:8000/api/v1/regulatory/run"
    info(f"Calling: POST {url}")
    try:
        req = urllib.request.Request(url, data=b"", method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode())
        ok(f"Backend pipeline triggered successfully")
        ok(f"  fetched={body.get('fetched')}  new_entries={body.get('new_entries')}")
        ok(f"  classified={body.get('changes_classified')}  notifications={body.get('notifications_added')}")
        print()
        ok("Notifications are now live in the backend server memory")
        ok("Open the frontend and click the Bell icon to see them")
        return True
    except urllib.error.URLError:
        warn("Backend is not running or not reachable at localhost:8000")
        warn("Start it first: uvicorn app.main:app --reload")
        warn("Then click the Bell icon on the frontend dashboard")
        return False
    except Exception as e:
        warn(f"Unexpected error calling backend: {e}")
        return False


# ============================================================
# MAIN
# ============================================================

def main():
    header("REGULATORY LAYER - FULL END-TO-END DEMONSTRATION")
    print(f"  Time    : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  Modules : scraper -> versioning -> change_detector -> rule_updater")
    print(f"            -> llm_extractor -> notifications -> scheduler -> push to backend")

    # Clear snapshot so all phases run with fresh data every time
    snapshot_path = os.path.join(BACKEND_ROOT, "app", "regulatory", "data", "latest.json")
    if os.path.exists(snapshot_path):
        os.remove(snapshot_path)
        print(f"\n  [>>]  Cleared previous snapshot - all items treated as new for this demo")

    data             = phase1_scrape()
    new_entries      = phase2_versioning(data)
    changes          = phase3_classify(new_entries)
    results, clauses = phase4_rule_updater(changes)
    rules            = phase5_llm_extraction(clauses)
    added            = phase6_notifications(changes, results)
    phase7_save_snapshot(data)
    phase8_scheduler_demo()
    pushed           = phase9_push_to_backend()

    header("COMPLETE - SUMMARY")
    print(f"  Scraped items       : {len(data)}")
    print(f"  New entries         : {len(new_entries)}")
    print(f"  Changes classified  : {len(changes)}")
    print(f"  PDFs auto-ingested  : {sum(1 for r in results if r['status'] == 'processed')}")
    print(f"  Clauses extracted   : {len(clauses)}")
    print(f"  LLM rules extracted : {len(rules)}")
    print(f"  Notifications added : {added}")
    print(f"  Pushed to backend   : {pushed}")
    print()
    if pushed:
        print(f"  Bell icon is ready - open http://localhost:3000 and click the Bell")
    else:
        print(f"  Backend not running. Start it then run:")
        print(f"  Invoke-WebRequest -Uri http://localhost:8000/api/v1/regulatory/run -Method POST")
    print()


if __name__ == "__main__":
    main()
