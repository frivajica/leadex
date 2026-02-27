#!/usr/bin/env python3
"""Validate that every VALID_PLACE_TYPES entry is in exactly one CATEGORY_GROUP."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.config import VALID_PLACE_TYPES

# --- Check snapshot (pre-implementation baseline) ---
SNAPSHOT_PATH = "/tmp/valid_place_types_snapshot.txt"

if os.path.exists(SNAPSHOT_PATH):
    with open(SNAPSHOT_PATH) as f:
        snapshot = set(line.strip() for line in f if line.strip())
    current = set(VALID_PLACE_TYPES)
    removed = snapshot - current
    added = current - snapshot
    if removed:
        print(f"⚠️  {len(removed)} categories REMOVED from VALID_PLACE_TYPES since snapshot:")
        for r in sorted(removed):
            print(f"   - {r}")
    if added:
        print(f"ℹ️  {len(added)} categories ADDED to VALID_PLACE_TYPES since snapshot:")
        for a in sorted(added):
            print(f"   + {a}")
    if not removed and not added:
        print(f"✅ VALID_PLACE_TYPES unchanged from snapshot ({len(snapshot)} types)")
    print()
else:
    print(f"ℹ️  No snapshot found at {SNAPSHOT_PATH} — skipping baseline comparison\n")

# --- Check CATEGORY_GROUPS coverage ---
try:
    from lib.config import CATEGORY_GROUPS
except ImportError:
    print("❌ CATEGORY_GROUPS not found in lib/config.py — has it been added yet?")
    sys.exit(1)

grouped = set()
duplicates = []

for group, members in CATEGORY_GROUPS.items():
    for cat in members:
        if cat in grouped:
            duplicates.append((cat, group))
        grouped.add(cat)

valid_set = set(VALID_PLACE_TYPES)
missing = valid_set - grouped
extra = grouped - valid_set

errors = False

if missing:
    errors = True
    print(f"❌ {len(missing)} categories NOT in any group:")
    for m in sorted(missing):
        print(f"   - {m}")

if extra:
    errors = True
    print(f"❌ {len(extra)} categories in groups but NOT in VALID_PLACE_TYPES:")
    for e in sorted(extra):
        print(f"   - {e}")

if duplicates:
    errors = True
    print(f"❌ {len(duplicates)} categories appear in multiple groups:")
    for cat, group in duplicates:
        print(f"   - {cat} (duplicate in {group})")

if not errors:
    print(f"✅ All {len(valid_set)} VALID_PLACE_TYPES are covered across {len(CATEGORY_GROUPS)} groups.")
    print(f"   Groups: {', '.join(CATEGORY_GROUPS.keys())}")

sys.exit(1 if errors else 0)
