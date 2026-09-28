#!/usr/bin/env python3
"""
Replace dead / frozen-storage image URLs in Aiven PostgreSQL with real Unsplash CDN photos.

Install (once):
  pip install psycopg2-binary

Usage:
  python load_real_safari_photos.py              # dry-run (report only)
  python load_real_safari_photos.py --execute    # UPDATE rows with broken image URLs
  python load_real_safari_photos.py --execute --all-rows  # refresh every row

Reads DATABASE_URL from `.env.local` at the project root (or from the environment).

After `--execute`, the public site uses sanitized fallbacks in `getPublicRecordImage()` while
the Admin panel shows raw `/api/media/` and Unsplash URLs via `resolveAdminPreviewImage()`.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
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

UNSPLASH_QS = "auto=format&fit=crop&w=1200&q=80"

# ---------------------------------------------------------------------------
# Real travel photo catalog (Unsplash CDN — no watermark)
# ---------------------------------------------------------------------------


def unsplash(photo_id: str) -> str:
    pid = photo_id.strip().lstrip("/")
    if not pid.startswith("photo-"):
        pid = f"photo-{pid}"
    return f"https://images.unsplash.com/{pid}?{UNSPLASH_QS}"


DEFAULT_SAFARI = unsplash("1516426122078-c23e9931aeeb")

# Countries — verified landscape assets
COUNTRY_PHOTOS: dict[str, str] = {
    "uganda": unsplash("1523805009345-744884127a0"),
    "kenya": unsplash("1549366021-9f761d450615"),
    "tanzania": unsplash("1509316785289-025f5b846b8f"),
    "rwanda": unsplash("1535335524737-94d487809111"),
}

# Categories — premium activity assets (longest keys matched first)
CATEGORY_PHOTOS: dict[str, str] = {
    "gorilla trekking": unsplash("1523805009345-744884127a0"),
    "wildlife safaris": unsplash("1516426122078-c23e9931aeeb"),
    "chimpanzee tracking": unsplash("1551969014-7d9720413452"),
    "birding tours": unsplash("1444464666168-49d633b86797"),
    "mountain climbing": unsplash("1464822759023-fed622ff2c3b"),
    "cultural tours": unsplash("1489392191929-878962fa5fcc"),
    "gorilla": unsplash("1523805009345-744884127a0"),
    "wildlife": unsplash("1516426122078-c23e9931aeeb"),
    "chimpanzee": unsplash("1551969014-7d9720413452"),
    "birding": unsplash("1444464666168-49d633b86797"),
    "kilimanjaro": unsplash("1464822759023-fed622ff2c3b"),
    "cultural": unsplash("1489392191929-878962fa5fcc"),
    "safari": unsplash("1516026672272-bc52d61a55d9"),
}

# National parks — habitat assets
PARK_PHOTOS: dict[str, str] = {
    "bwindi": unsplash("1523805009345-744884127a0"),
    "queen elizabeth": unsplash("1516426122078-c23e9931aeeb"),
    "murchison falls": unsplash("1509316785289-025f5b846b8f"),
    "kidepo": unsplash("1549366021-9f761d450615"),
    "masai mara": unsplash("1549366021-9f761d450615"),
    "maasai mara": unsplash("1549366021-9f761d450615"),
    "serengeti": unsplash("1516026672272-bc52d61a55d9"),
    "ngorongoro": unsplash("1509316785289-025f5b846b8f"),
}

# Accommodations — lodge / camp textures
ACCOMMODATION_PHOTOS: dict[str, str] = {
    "tented camp": unsplash("1478131143081-80f7f84bdaa2"),
    "lodge": unsplash("1566073771259-6a8506099945"),
    "camp": unsplash("1478131143081-80f7f84bdaa2"),
    "hotel": unsplash("1566073771259-6a8506099945"),
    "resort": unsplash("1571896349842-33c89424de2d"),
}

# Tables to process (logical name → physical candidates in `public` schema)
TARGET_TABLES: list[tuple[str, tuple[str, ...]]] = [
    ("tours", ("tours",)),
    ("destinations", ("destinations", "countries")),
    ("categories", ("categories",)),
    ("national_parks", ("national_parks", "national_park")),
    ("accommodations", ("accommodations",)),
]

TABLE_RULES: dict[str, list[tuple[str, str]]] = {
    "tours": sorted(
        {**CATEGORY_PHOTOS, **COUNTRY_PHOTOS, **PARK_PHOTOS}.items(),
        key=lambda x: len(x[0]),
        reverse=True,
    ),
    "destinations": sorted(COUNTRY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "categories": sorted(CATEGORY_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "national_parks": sorted(PARK_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "national_park": sorted(PARK_PHOTOS.items(), key=lambda x: len(x[0]), reverse=True),
    "accommodations": sorted(
        {**ACCOMMODATION_PHOTOS, **PARK_PHOTOS, **COUNTRY_PHOTOS}.items(),
        key=lambda x: len(x[0]),
        reverse=True,
    ),
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
    "supabase.co/storage",
    "/object/authenticated/",
    "/object/sign/",
    "/media/",
    "/uploads/",
    "localhost",
    "127.0.0.1",
    "placeholder",
    "via.placeholder",
    "frozen",
    "expired",
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


def row_title_haystack(row: dict[str, Any]) -> str:
    """Primary match text from title / name, then supporting fields."""
    title_bits = [normalize_text(row.get(c)) for c in TITLE_COLUMNS if c in row and row.get(c)]
    title = " ".join(bit for bit in title_bits if bit)
    if title:
        extra = [str(row[c]) for c in TEXT_COLUMNS if c in row and row[c] and c not in TITLE_COLUMNS]
        return normalize_text(f"{title} {' '.join(extra)}")
    return normalize_text(" ".join(str(row[c]) for c in TEXT_COLUMNS if c in row and row[c]))


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
    if text.startswith("/") and not text.startswith("//"):
        if text.startswith("/heroes/") or text.startswith("/api/media/") or text.startswith("/cms-media/"):
            return False
        if not text.startswith("https:"):
            return True
    return False


def match_photo(logical_table: str, physical_table: str, haystack: str) -> str:
    key = logical_table
    if logical_table == "destinations" and physical_table == "countries":
        key = "destinations"
    rules = TABLE_RULES.get(physical_table) or TABLE_RULES.get(key, [])
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
    cols = existing_columns(cur, physical_name)
    img_col = pick_primary_image_column(cols)
    if not img_col:
        print(f"  [skip] {physical_name}: no image column")
        return 0, 0

    image_cols_present = [c for c in IMAGE_COLUMNS if c in cols]
    select_cols = ["id"] + [c for c in TEXT_COLUMNS if c in cols] + image_cols_present
    select_sql = ", ".join(f'"{c}"' for c in select_cols)

    cur.execute(f'SELECT {select_sql} FROM "{physical_name}" ORDER BY id')
    rows = [dict(r) for r in cur.fetchall()]
    planned = 0
    updated = 0

    for row in rows:
        row_id = row.get("id")
        if row_id is None:
            continue

        haystack = row_title_haystack(row)
        new_url = match_photo(logical_name, physical_name, haystack)

        sets: dict[str, str] = {}
        for col in image_cols_present:
            current = row.get(col)
            if force_all or is_broken_image(current):
                if str(current or "").strip() == new_url:
                    continue
                sets[col] = new_url

        if not sets:
            continue

        planned += 1
        label = (haystack or "")[:80]
        print(f"  [{physical_name}] id={row_id} | {label}")
        print(f"    -> {new_url}")

        if execute:
            assign = ", ".join(f'"{k}" = %s' for k in sets)
            cur.execute(
                f'UPDATE "{physical_name}" SET {assign} WHERE id = %s',
                [*sets.values(), row_id],
            )
            updated += 1

    return planned, updated


def connect_aiven(database_url: str):
    """Connect with SSL suitable for Aiven PostgreSQL."""
    try:
        return psycopg2.connect(database_url, sslmode="require")
    except psycopg2.Error:
        return psycopg2.connect(database_url)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Load real Unsplash safari photos into Aiven CMS tables (logo-free)."
    )
    parser.add_argument("--execute", action="store_true", help="Apply UPDATE statements.")
    parser.add_argument(
        "--all-rows",
        action="store_true",
        help="Update every image column on every row (default: broken URLs only).",
    )
    args = parser.parse_args()

    load_env_local()
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL missing. Add it to .env.local in the project root.", file=sys.stderr)
        return 1

    mode = "EXECUTE" if args.execute else "DRY-RUN"
    scope = "all rows" if args.all_rows else "broken URLs only"
    print(f"load_real_safari_photos.py — {mode} ({scope})\n")

    conn = connect_aiven(database_url)
    conn.autocommit = False
    total_planned = 0
    total_updated = 0

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SET statement_timeout = 300000")
            for logical, candidates in TARGET_TABLES:
                physical = resolve_physical_table(cur, candidates)
                if not physical:
                    print(f"[missing] {logical}: none of {candidates} found in public schema")
                    continue
                print(f"\n=== {logical} → public.{physical} ===")
                planned, updated = process_table(
                    cur, logical, physical, args.execute, args.all_rows
                )
                total_planned += planned
                total_updated += updated

        if args.execute:
            conn.commit()
            print(f"\nCommitted {total_updated} row update(s) ({total_planned} planned).")
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
