#!/usr/bin/env python3
"""
Replace dead / placeholder image URLs in Aiven PostgreSQL with real Unsplash CDN photos.

Install (once):
  pip install psycopg2-binary

Usage:
  python load_real_safari_photos.py              # dry-run report
  python load_real_safari_photos.py --execute    # apply UPDATEs (broken URLs only)
  python load_real_safari_photos.py --execute --all-rows

Reads DATABASE_URL from .env.local in the project root (or environment).
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("Missing dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env.local"

UNSPLASH_QS = "auto=format&fit=crop&w=1200&q=80"

# ---------------------------------------------------------------------------
# Photo catalog — Unsplash CDN (no watermark)
# ---------------------------------------------------------------------------


def unsplash(photo_id: str) -> str:
    pid = photo_id.strip().lstrip("/")
    if not pid.startswith("photo-"):
        pid = f"photo-{pid}"
    return f"https://images.unsplash.com/{pid}?{UNSPLASH_QS}"


DEFAULT_SAFARI = unsplash("photo-1516426122078-c23e9931aeeb")

COUNTRY_PHOTOS: dict[str, str] = {
    "uganda": unsplash("photo-1523805009345-744884127a0"),
    "kenya": unsplash("photo-1549366021-9f761d450615"),
    "tanzania": unsplash("photo-1509316785289-025f5b846b8f"),
    "rwanda": unsplash("photo-1535335524737-94d487809111"),
}

CATEGORY_PHOTOS: dict[str, str] = {
    "gorilla trekking": unsplash("photo-1523805009345-744884127a0"),
    "gorilla": unsplash("photo-1523805009345-744884127a0"),
    "wildlife safaris": unsplash("photo-1516426122078-c23e9931aeeb"),
    "wildlife": unsplash("photo-1516426122078-c23e9931aeeb"),
    "safari": unsplash("photo-1516026672272-bc52d61a55d9"),
    "chimpanzee tracking": unsplash("photo-1551969014-7d9720413452"),
    "chimpanzee": unsplash("photo-1551969014-7d9720413452"),
    "birding tours": unsplash("photo-1444464666168-49d633b86797"),
    "birding": unsplash("photo-1444464666168-49d633b86797"),
    "mountain climbing": unsplash("photo-1464822759023-fed622ff2c3b"),
    "kilimanjaro": unsplash("photo-1464822759023-fed622ff2c3b"),
    "cultural tours": unsplash("photo-1489392191929-878962fa5fcc"),
    "cultural": unsplash("photo-1489392191929-878962fa5fcc"),
}

PARK_PHOTOS: dict[str, str] = {
    "bwindi": unsplash("photo-1523805009345-744884127a0"),
    "queen elizabeth": unsplash("photo-1516426122078-c23e9931aeeb"),
    "murchison falls": unsplash("photo-1509316785289-025f5b846b8f"),
    "kidepo": unsplash("photo-1549366021-9f761d450615"),
    "masai mara": unsplash("photo-1549366021-9f761d450615"),
    "maasai mara": unsplash("photo-1549366021-9f761d450615"),
    "serengeti": unsplash("photo-1516026672272-bc52d61a55d9"),
    "ngorongoro": unsplash("photo-1509316785289-025f5b846b8f"),
    "volcanoes": unsplash("photo-1535335524737-94d487809111"),
}

ACCOMMODATION_PHOTOS: dict[str, str] = {
    "lodge": unsplash("photo-1566073771259-6a8506099945"),
    "camp": unsplash("photo-1478131143081-80f7f84bdaa2"),
    "tented camp": unsplash("photo-1478131143081-80f7f84bdaa2"),
    "hotel": unsplash("photo-1566073771259-6a8506099945"),
    "resort": unsplash("photo-1571896349842-33c89424de2d"),
}

TABLE_CANDIDATES: list[tuple[str, tuple[str, ...]]] = [
    ("tours", ("tours",)),
    ("categories", ("categories",)),
    ("national_parks", ("national_parks", "national_park", "parks")),
    ("accommodations", ("accommodations",)),
    ("explore", ("explore",)),
    ("safari_updates", ("safari_updates",)),
    ("pages", ("pages",)),
    ("landing_pages", ("landing_pages",)),
]

TABLE_RULES: dict[str, list[tuple[str, str]]] = {
    "tours": sorted(
        {**CATEGORY_PHOTOS, **COUNTRY_PHOTOS, **PARK_PHOTOS}.items(),
        key=lambda x: len(x[0]),
        reverse=True,
    ),
    "destinations": sorted(COUNTRY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "countries": sorted(COUNTRY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "categories": sorted(CATEGORY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "national_parks": sorted(PARK_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "national_park": sorted(PARK_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "parks": sorted(PARK_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "accommodations": sorted(
        {**ACCOMMODATION_PHOTOS, **PARK_PHOTOS, **COUNTRY_PHOTOS}.items(),
        key=lambda x: len(x[0]),
        reverse=True,
    ),
    "explore": sorted({**PARK_PHOTOS, **COUNTRY_PHOTOS}.items(), key=lambda x: len(x[0]), reverse=True),
    "safari_updates": sorted(CATEGORY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "pages": sorted(CATEGORY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "landing_pages": sorted(COUNTRY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
}

TITLE_COLUMNS = ("title", "name", "post_title", "label")
TEXT_COLUMNS = (
    "title",
    "name",
    "post_title",
    "slug",
    "country",
    "category",
    "location",
    "national_park_name",
    "national_park",
    "park_name",
    "type",
    "description_title",
)
IMAGE_COLUMNS = (
    "image_url",
    "image",
    "cover_image",
    "featured_image",
    "social_image_url",
    "thumbnail",
    "photo",
    "banner",
)

BROKEN_MARKERS = (
    "eton-safaris-gorilla",
    "media.base44.com",
    "/media/",
    "/uploads/",
    "localhost",
    "127.0.0.1",
    "/object/authenticated/",
    "/object/sign/",
    "placeholder",
    "via.placeholder",
    "/heroes/community",
    "/heroes/talk-to-us",
)


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


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip().lower())


def haystack_from_row(row: dict[str, Any]) -> str:
    parts = [str(row[c]) for c in TEXT_COLUMNS if c in row and row[c]]
    return normalize_text(" ".join(parts))


def is_broken_image(value: Any) -> bool:
    if value is None:
        return True
    text = str(value).strip()
    if not text or text.lower() in ("null", "undefined", "none", "-"):
        return True
    lower = text.lower()
    for marker in BROKEN_MARKERS:
        if marker in lower:
            return True
    if text.startswith("/") and "/api/media/" in lower:
        return True
    return False


def match_photo(table_key: str, haystack: str) -> str:
    rules = TABLE_RULES.get(table_key, [])
    for keyword, url in rules:
        if keyword in haystack:
            return url
    for keyword, url in sorted(COUNTRY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True):
        if keyword in haystack:
            return url
    for keyword, url in sorted(PARK_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True):
        if keyword in haystack:
            return url
    return DEFAULT_SAFARI


def table_exists(cur, table: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = %s LIMIT 1
        """,
        (table,),
    )
    return cur.fetchone() is not None


def existing_columns(cur, table: str) -> set[str]:
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table,),
    )
    return {r[0] for r in cur.fetchall()}


def resolve_physical_table(cur, candidates: tuple[str, ...]) -> str | None:
    for name in candidates:
        if table_exists(cur, name):
            return name
    return None


def pick_primary_image_column(cols: set[str]) -> str | None:
    for name in IMAGE_COLUMNS:
        if name in cols:
            return name
    return None


def process_table(
    cur,
    logical_name: str,
    physical_name: str,
    execute: bool,
    force_all: bool,
) -> tuple[int, int]:
    if physical_name == "countries":
        print("  [skip] countries — run purge_conflicting_countries.py for official /heroes paths")
        return 0, 0

    cols = existing_columns(cur, physical_name)
    img_col = pick_primary_image_column(cols)
    if not img_col:
        print(f"  [skip] {physical_name}: no image column")
        return 0, 0

    extra = [c for c in IMAGE_COLUMNS if c in cols and c != img_col]
    select_cols = ["id"] + [c for c in TEXT_COLUMNS if c in cols] + [img_col] + [
        c for c in extra if c not in TEXT_COLUMNS
    ]

    cur.execute(f'SELECT {", ".join(select_cols)} FROM "{physical_name}" ORDER BY id')
    rows = [dict(r) for r in cur.fetchall()]
    planned = 0
    updated = 0

    for row in rows:
        row_id = row.get("id")
        if row_id is None:
            continue
        haystack = haystack_from_row(row)
        if not haystack:
            haystack = " ".join(normalize_text(row.get(c)) for c in TITLE_COLUMNS if c in row)

        new_url = match_photo(physical_name if physical_name in TABLE_RULES else logical_name, haystack)
        if logical_name == "destinations" and physical_name == "countries":
            new_url = match_photo("countries", haystack)

        current = row.get(img_col)
        sets: dict[str, str] = {}
        if force_all or is_broken_image(current):
            sets[img_col] = new_url
        if "social_image_url" in extra and (force_all or is_broken_image(row.get("social_image_url"))):
            sets["social_image_url"] = new_url
        for col in extra:
            if col == "social_image_url" or col in sets:
                continue
            if force_all or is_broken_image(row.get(col)):
                sets[col] = new_url
        if not sets:
            continue

        planned += 1
        print(f"  [{physical_name}] id={row_id} | {(haystack or '')[:72]}")
        print(f"    -> {new_url}")

        if execute:
            assign = ", ".join(f'"{k}" = %s' for k in sets)
            cur.execute(
                f'UPDATE "{physical_name}" SET {assign} WHERE id = %s',
                [*sets.values(), row_id],
            )
            updated += 1

    return planned, updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Load real Unsplash photos into Aiven CMS tables.")
    parser.add_argument("--execute", action="store_true", help="Apply UPDATEs (default: dry-run).")
    parser.add_argument("--all-rows", action="store_true", help="Update every row, not only broken URLs.")
    args = parser.parse_args()

    load_env_local()
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL missing. Add it to .env.local.", file=sys.stderr)
        return 1

    print(f"load_real_safari_photos.py — {'EXECUTE' if args.execute else 'DRY-RUN'}\n")

    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    total_planned = 0
    total_updated = 0

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for logical, candidates in TABLE_CANDIDATES:
                physical = resolve_physical_table(cur, candidates)
                if not physical:
                    print(f"[missing] {logical}: none of {candidates} in public schema")
                    continue
                print(f"\n=== {logical} → public.{physical} ===")
                planned, updated = process_table(
                    cur, logical, physical, args.execute, args.all_rows
                )
                total_planned += planned
                total_updated += updated

        if args.execute:
            conn.commit()
            print(f"\nCommitted {total_updated} update(s) ({total_planned} planned).")
        else:
            conn.rollback()
            print(f"\nDry-run: {total_planned} row(s) would update. Re-run with --execute.")
    except Exception as exc:
        conn.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
