#!/usr/bin/env python3
"""
Audit Aiven PostgreSQL `accommodations` and remove fictional / generated stays.

Keeps verified real lodges from the project catalog (data/real-park-accommodations-*.json),
iconic East Africa baseline properties, and known hotel groups. Updates descriptions for
catalog properties located on the park edge or nearby.

Install (once):
  pip install psycopg2-binary

Usage:
  python purge_fake_accommodations.py              # dry-run report
  python purge_fake_accommodations.py --execute    # DELETE fakes + UPDATE nearby copy

Reads DATABASE_URL from .env.local at the project root.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env.local"
CATALOG_GLOB = "real-park-accommodations-*.json"

# —— Iconic verified lodges & camps (baseline; catalog JSON extends this) ——
TRUSTED_BASELINE_NAMES: tuple[str, ...] = (
    "Chobe Safari Lodge",
    "Paraa Safari Lodge",
    "Mweya Safari Lodge",
    "Kyambura Gorge Lodge",
    "Clouds Mountain Gorilla Lodge",
    "Mahogany Springs Lodge",
    "Sanctuary Gorilla Forest Camp",
    "Buhoma Lodge",
    "Silverback Lodge",
    "Mount Gahinga Lodge",
    "Nkuringo Bwindi Gorilla Lodge",
    "Gorilla Forest Camp",
    "Volcanoes Virunga Lodge",
    "Bisate Lodge",
    "One&Only Gorilla's Nest",
    "Singita Kwitonda Lodge",
    "Magashi Camp",
    "Serengeti Serena Safari Lodge",
    "Ngorongoro Serena Safari Lodge",
    "Lake Manyara Serena Safari Lodge",
    "Amboseli Serena Safari Lodge",
    "Mara Serena Safari Lodge",
    "Kilaguni Serena Safari Lodge",
    "Sweetwaters Serena Camp",
    "Sarova Mara Game Camp",
    "Sarova Lion Hill Game Lodge",
    "Sarova Whitesands Beach Resort",
    "Ashnil Mara Camp",
    "Ashnil Aruba Lodge",
    "Governors' Camp",
    "Governors' Il Moran Camp",
    "Little Governors' Camp",
    "Angama Mara",
    "andBeyond Ngorongoro Crater Lodge",
    "andBeyond Grumeti Serengeti River Lodge",
    "Four Seasons Safari Lodge Serengeti",
    "Sanctuary Kichakani Serengeti Camp",
    "Elewana Serengeti Pioneer Camp",
    "Elewana Tortilis Camp Amboseli",
    "Fairmont Mount Kenya Safari Club",
    "Hemingways Nairobi",
    "Giraffe Manor",
    "Tarangire Safari Lodge",
    "Lake Burunge Tented Lodge",
    "Kichwa Tembo Tented Camp",
    "Sanctuary Olonana",
    "Sanctuary Tambarare",
    "Sanctuary Ngorongoro Crater Camp",
    "Wilderness Bisate Lodge",
    "One Nature Nyaruswiga",
    "Kyaninga Lodge",
    "Primate Lodge Kibale",
    "Ndali Lodge",
    "Crater Safari Lodge",
    "Ishasha Wilderness Camp",
    "Jacana Safari Lodge",
    "Murchison River Lodge",
    "Pakuba Safari Lodge",
    "Baker's Lodge",
    "Nile Safari Lodge",
    "Twiga Lodge",
    "Sambiya River Lodge",
    "Red Chilli Rest Camp",
    "Fort Murchison",
    "Bwindi Lodge",
    "Trackers Safari Lodge",
    "Sanctuary Gorilla Forest Camp",
    "Sabyinyo Silverback Lodge",
    "Virunga Lodge",
    "Five Volcanoes Boutique Hotel",
    "Mountain Gorilla View Lodge",
    "Le Bambou Gorilla Lodge",
    "Da Vinci Gorilla Lodge",
)

# Known groups — substring match on normalized name
TRUSTED_BRAND_SUBSTRINGS: tuple[str, ...] = (
    "serena",
    "sarova",
    "ashnil",
    "andbeyond",
    "and beyond",
    "sanctuary ",
    "elewana",
    "governors",
    "fairmont",
    "hemingways",
    "four seasons",
    "one&only",
    "singita",
    "wilderness ",
    "volcanoes safaris",
    "asilia",
    "great plains",
    "ker & downey",
    "bushtops",
    "angama",
    "giraffe manor",
    "wilderness safaris",
    "cheli & peacock",
    "lemala",
    "nomad tanzania",
    "bushtops camps",
)

FAKE_STYLE_WORDS = (
    "river",
    "savannah",
    "forest",
    "hilltop",
    "horizon",
    "baobab",
    "mist",
    "sunset",
    "valley",
    "lagoon",
    "canyon",
    "plateau",
    "oasis",
    "crest",
    "trail",
)
FAKE_TIER_WORDS = ("luxury", "safari")
FAKE_NOUN_WORDS = ("lodge", "camp", "hotel", "bandas")

FAKE_GENERATED_RE = re.compile(
    r"\b("
    + "|".join(FAKE_STYLE_WORDS)
    + r")\s+("
    + "|".join(FAKE_TIER_WORDS)
    + r")\s+("
    + "|".join(FAKE_NOUN_WORDS)
    + r")\b",
    re.I,
)

PLACEHOLDER_RE = re.compile(
    r"\b(test\s+lodge|test\s+hotel|sample\s+hotel|sample\s+lodge|placeholder|"
    r"lorem\s+ipsum|fake\s+hotel|demo\s+lodge|untitled|xxx+|asdf|todo\s+stay)\b",
    re.I,
)

VERIFIED_NEARBY_SNIPPET = "Verified property located nearby."

NEARBY_PLACEMENTS = frozenset({"edge", "near", "outside", "buffer"})


@dataclass
class CatalogEntry:
    name: str
    country: str
    national_park: str
    placement: str
    website: str


def load_env_local() -> None:
    if not ENV_FILE.is_file():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def normalize_name(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[''`]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_catalog() -> dict[str, CatalogEntry]:
    """Map normalized name -> catalog row."""
    catalog: dict[str, CatalogEntry] = {}
    data_dir = ROOT / "data"
    if not data_dir.is_dir():
        return catalog
    for path in sorted(data_dir.glob(CATALOG_GLOB)):
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as err:
            print(f"Warning: could not read {path.name}: {err}", file=sys.stderr)
            continue
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            name = str(row.get("name") or "").strip()
            if not name:
                continue
            key = normalize_name(name)
            catalog[key] = CatalogEntry(
                name=name,
                country=str(row.get("country") or "").strip(),
                national_park=str(row.get("national_park") or "").strip(),
                placement=str(row.get("placement") or "").strip().lower(),
                website=str(row.get("website") or "").strip(),
            )
    return catalog


def build_trusted_name_set(catalog: dict[str, CatalogEntry]) -> set[str]:
    trusted = {normalize_name(n) for n in TRUSTED_BASELINE_NAMES}
    trusted.update(catalog.keys())
    return trusted


def name_matches_trusted(name: str, trusted: set[str], catalog: dict[str, CatalogEntry]) -> CatalogEntry | None:
    norm = normalize_name(name)
    if not norm:
        return None
    if norm in trusted:
        return catalog.get(norm)
    # Fuzzy: catalog name contained in DB name or vice versa (min length guard)
    for key, entry in catalog.items():
        if len(key) < 8 and key != norm:
            continue
        if key in norm or norm in key:
            return entry
    for key in trusted:
        if len(key) < 10:
            continue
        if key in norm or norm in key:
            return catalog.get(key)
    return None


def has_trusted_brand(name: str) -> bool:
    norm = normalize_name(name)
    return any(brand in norm for brand in TRUSTED_BRAND_SUBSTRINGS)


def is_obviously_fake(name: str, location: str, description_title: str) -> bool:
    combined = f"{name} {location} {description_title}"
    if PLACEHOLDER_RE.search(combined):
        return True
    if FAKE_GENERATED_RE.search(name or ""):
        return True
    # Bulk-seed pattern: "{Park Name} {Style} {Tier} {Noun}" with park prefix
    if re.search(
        r"national\s+park.*\b(" + "|".join(FAKE_STYLE_WORDS) + r")\b",
        normalize_name(name),
    ):
        return True
    # Meaningless short titles
    norm = normalize_name(name)
    if len(norm) < 4:
        return True
    if re.fullmatch(r"[a-z0-9 ]{0,12}", norm) and "lodge" not in norm and "camp" not in norm:
        if len(norm.split()) <= 1:
            return True
    return False


def existing_columns(cur, table: str) -> set[str]:
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table,),
    )
    return {row[0] for row in cur.fetchall()}


def pick_column(cols: set[str], *candidates: str) -> str | None:
    for c in candidates:
        if c in cols:
            return c
    return None


def append_verified_nearby_description(description: str | None) -> str:
    text = (description or "").strip()
    if VERIFIED_NEARBY_SNIPPET.lower() in text.lower():
        return text
    if not text:
        return VERIFIED_NEARBY_SNIPPET
    return f"{text}\n\n<p>{VERIFIED_NEARBY_SNIPPET}</p>"


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge fake accommodations from Aiven PostgreSQL.")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Apply DELETE and description UPDATEs (default: dry-run only).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Process at most N rows (0 = all).",
    )
    args = parser.parse_args()

    load_env_local()
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL is not set in .env.local or environment.", file=sys.stderr)
        return 1

    catalog = load_catalog()
    trusted = build_trusted_name_set(catalog)
    print(f"Trusted names (baseline + catalog): {len(trusted)} entries from {len(catalog)} catalog rows.")

    conn = psycopg2.connect(database_url, sslmode="require")
    conn.autocommit = False

    report: dict[str, Any] = {
        "mode": "execute" if args.execute else "dry-run",
        "scanned": 0,
        "kept": 0,
        "deleted": 0,
        "descriptions_updated": 0,
        "delete_samples": [],
        "keep_samples": [],
    }

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SET statement_timeout = 300000")

            cols = existing_columns(cur, "accommodations")
            if not cols:
                print("Table `accommodations` not found or not accessible.", file=sys.stderr)
                return 1
            name_col = pick_column(cols, "name", "title")
            if not name_col:
                print("No name/title column on accommodations.", file=sys.stderr)
                return 1

            select_cols = ["id", name_col]
            loc_col = pick_column(cols, "location", "address")
            if loc_col:
                select_cols.append(loc_col)
            desc_col = pick_column(cols, "description")
            if desc_col:
                select_cols.append(desc_col)
            dt_col = pick_column(cols, "description_title")
            if dt_col:
                select_cols.append(dt_col)
            country_col = pick_column(cols, "country")
            if country_col:
                select_cols.append(country_col)

            sql = f'SELECT {", ".join(select_cols)} FROM accommodations ORDER BY id'
            cur.execute(sql)
            rows = cur.fetchall()
            if args.limit > 0:
                rows = rows[: args.limit]

            report["scanned"] = len(rows)
            to_delete: list[Any] = []
            to_update_desc: list[tuple[Any, str]] = []

            for row in rows:
                name = str(row.get(name_col) or "").strip()
                location = str(row.get(loc_col) or "") if loc_col else ""
                desc_title = str(row.get(dt_col) or "") if dt_col else ""
                row_id = row["id"]

                catalog_hit = name_matches_trusted(name, trusted, catalog)
                trusted_row = catalog_hit is not None or has_trusted_brand(name)

                if trusted_row and not is_obviously_fake(name, location, desc_title):
                    report["kept"] += 1
                    if len(report["keep_samples"]) < 15:
                        report["keep_samples"].append(name)
                    if catalog_hit and catalog_hit.placement in NEARBY_PLACEMENTS and desc_col:
                        new_desc = append_verified_nearby_description(
                            str(row.get(desc_col) or "")
                        )
                        if new_desc != (row.get(desc_col) or ""):
                            to_update_desc.append((row_id, new_desc))
                    continue

                to_delete.append(row_id)
                if len(report["delete_samples"]) < 25:
                    report["delete_samples"].append(
                        {"id": row_id, "name": name, "location": location[:80]}
                    )

            print(json.dumps({**report, "pending_delete": len(to_delete), "pending_desc_updates": len(to_update_desc)}, indent=2))

            if not args.execute:
                print("\nDry-run only. Re-run with --execute to DELETE and UPDATE.")
                return 0

            if to_update_desc and desc_col:
                for row_id, new_desc in to_update_desc:
                    cur.execute(
                        f"UPDATE accommodations SET {desc_col} = %s WHERE id = %s",
                        (new_desc, row_id),
                    )
                report["descriptions_updated"] = len(to_update_desc)

            if to_delete:
                deleted = 0
                for row_id in to_delete:
                    cur.execute("DELETE FROM accommodations WHERE id = %s", (row_id,))
                    deleted += cur.rowcount
                report["deleted"] = deleted

            conn.commit()
            print(json.dumps(report, indent=2))
            return 0

    except Exception as err:
        conn.rollback()
        print(f"Error: {err}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
