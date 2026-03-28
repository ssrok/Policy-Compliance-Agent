"""
run_regulatory_pipeline.py
---------------------------
Runs the FULL regulatory intelligence pipeline once - all 7 steps:

    1. scraper.fetch_all_sources()              - fetch live data from RBI / SEBI
    2. versioning.load_previous()               - load last saved snapshot
    3. versioning.detect_new_entries()          - diff old vs new
    4. change_detector.detect_changes()         - classify new entries
    5. rule_updater.process_new_policies()      - attempt PDF ingestion
    6. notification_manager.add_notifications() - store alerts in memory
    7. versioning.save_latest()                 - persist snapshot to latest.json

Usage (from backend/ directory, with venv active):
    python run_regulatory_pipeline.py

To see notifications on the frontend:
    POST http://localhost:8000/api/v1/regulatory/run  (while uvicorn is running)
"""

import sys
import os
import logging
from datetime import datetime, timezone

# Force UTF-8 output on Windows to avoid charmap errors
sys.stdout.reconfigure(encoding="utf-8")

BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("pipeline_runner")

SEP  = "-" * 60
SEP2 = "=" * 60

def step(n, label):
    print(f"\n{SEP}\n  STEP {n}: {label}\n{SEP}")

def section(label):
    print(f"\n{SEP2}\n  {label}\n{SEP2}")


def run():
    section("REGULATORY INTELLIGENCE PIPELINE - FULL RUN")
    print(f"  Started at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")

    # Step 1: Fetch
    step(1, "Fetching live data from RBI / SEBI")
    from app.regulatory.scraper import fetch_all_sources
    data = fetch_all_sources()
    print(f"  [OK] Fetched {len(data)} total items across all sources")

    if not data:
        print("  [FAIL] No data fetched - check network / source availability")
        sys.exit(1)

    print("\n  Sample (first 3 items):")
    for item in data[:3]:
        print(f"    [{item.get('source','?')}] {item.get('title','?')[:80]}")

    # Step 2: Load previous snapshot
    step(2, "Loading previous snapshot (latest.json)")
    from app.regulatory.versioning import load_previous, detect_new_entries, save_latest
    old = load_previous()
    print(f"  [OK] Loaded {len(old)} previously saved entries")
    if len(old) == 0:
        print("    (First run - all scraped items will be treated as new)")

    # Step 3: Detect new entries
    step(3, "Detecting new entries (diff old vs new)")
    new_entries = detect_new_entries(old, data)
    print(f"  [OK] {len(new_entries)} new entries detected (out of {len(data)} fetched)")

    if not new_entries:
        print("  [OK] No new entries - saving updated snapshot and exiting")
        save_latest(data)
        section("RESULT: No new regulatory changes detected")
        sys.exit(0)

    # Step 4: Classify changes
    step(4, "Classifying changes (change_detector)")
    from app.regulatory.change_detector import detect_changes
    changes = detect_changes(new_entries)
    print(f"  [OK] {len(changes)} changes classified")

    type_counts: dict = {}
    for c in changes:
        ct = c.get("change_type", "OTHER")
        type_counts[ct] = type_counts.get(ct, 0) + 1
    print("\n  Classification breakdown:")
    for ct, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"    {ct:<20} {count} items")

    # Step 5: Rule updater (PDF ingestion)
    step(5, "Processing policies via rule_updater (PDF ingestion)")
    from app.regulatory.rule_updater import process_new_policies
    results = process_new_policies(changes)

    processed = [r for r in results if r["status"] == "processed"]
    skipped   = [r for r in results if r["status"] == "skipped"]
    failed    = [r for r in results if r["status"] == "failed"]

    print(f"  [OK] processed={len(processed)}  skipped={len(skipped)}  failed={len(failed)}")
    if processed:
        print("\n  Auto-ingested PDFs:")
        for r in processed:
            print(f"    [OK] {r['title'][:70]} - {r['rules_generated']} clauses")
    if failed:
        print("\n  Failed:")
        for r in failed:
            print(f"    [FAIL] {r['title'][:70]} - {r['reason']}")

    # Step 6: Notifications
    step(6, "Storing notifications (notification_manager)")
    from app.regulatory.notifications import notification_manager

    actionable_titles = {r["title"] for r in processed}
    for c in changes:
        c["actionable"] = c.get("title", "") in actionable_titles

    added = notification_manager.add_notifications(changes)
    print(f"  [OK] {added} notifications stored in memory")

    # Step 7: Save snapshot
    step(7, "Saving new snapshot to latest.json")
    save_latest(data)
    data_path = os.path.join(BACKEND_ROOT, "app", "regulatory", "data", "latest.json")
    size_kb = os.path.getsize(data_path) / 1024 if os.path.exists(data_path) else 0
    print(f"  [OK] Saved {len(data)} entries -> {data_path}")
    print(f"    File size: {size_kb:.1f} KB")

    # Summary
    section("PIPELINE COMPLETE - SUMMARY")
    print(f"  Fetched total items   : {len(data)}")
    print(f"  New entries detected  : {len(new_entries)}")
    print(f"  Changes classified    : {len(changes)}")
    print(f"  PDFs processed        : {len(processed)}")
    print(f"  Notifications added   : {added}")
    print(f"\n  Snapshot saved to     : app/regulatory/data/latest.json")
    print(f"\n  To see notifications on the frontend:")
    print(f"    1. Keep backend running  (uvicorn app.main:app --reload)")
    print(f"    2. POST http://localhost:8000/api/v1/regulatory/run")
    print(f"    3. Click the Bell icon on the frontend dashboard\n")


if __name__ == "__main__":
    run()
