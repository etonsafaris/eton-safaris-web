#!/usr/bin/env python3
"""
Audit safari tour cover images and replace legacy mismatched paths with
context-matched, optimized Unsplash CDN URLs.

Usage:
  pip install psycopg2-binary python-dotenv
  python clean_safari_images.py              # dry-run (no DB writes)
  python clean_safari_images.py --apply        # commit updates
  python clean_safari_images.py --apply --limit 50
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Iterable, Optional, Sequence, Tuple
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None  # type: ignore

ROOT = Path(__file__).resolve().parent
ENV_FILES = (ROOT / ".env.local", ROOT / ".env")

UNSPLASH_PARAMS = "?auto=format&fit=crop&w=1200&q=80"

# (keywords, category label, optimized Unsplash image URL)
IMAGE_RULES: Sequence[Tuple[Sequence[str], str, str]] = (
    (
        ("gorilla", "bwindi", "mgahinga", "trekking", "mountain gorilla"),
        "gorilla_trekking",
        f"https://images.unsplash.com/photo-1540573133985-87ca06aa2c8e{UNSPLASH_PARAMS}",
    ),
    (
        ("chimpanzee", "chimp", "kibale", "primate", "nyungwe"),
        "primate",
        f"https://images.unsplash.com/photo-1534567110130-fee9a1d02e24{UNSPLASH_PARAMS}",
    ),
    (
        ("queen elizabeth", "murchison", "kidepo", "wildlife", "game drive", "safari"),
        "savanna_wildlife",
        f"https://images.unsplash.com/photo-1516426122078-c23e76319801{UNSPLASH_PARAMS}",
    ),
    (
        ("nile", "jinja", "boat", "river", "murchison falls"),
        "river_landscape",
        f"https://images.unsplash.com/photo-1509316785289-025f5b846b8f{UNSPLASH_PARAMS}",
    ),
    (
        ("birding", "shoebill", "bird watch", "ornithology"),
        "birding",
        f"https://images.unsplash.com/photo-1444464666168-49d633b86797{UNSPLASH_PARAMS}",
    ),
)


def load_database_url() -> str:
    for env_path in ENV_FILES:
        if env_path.is_file() and load_dotenv:
            load_dotenv(env_path, override=False)
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL not found. Add it to .env.local in the project root."
        )
    return url


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def match_category(title: str) -> Optional[Tuple[str, str]]:
    haystack = normalize_title(title)
    if not haystack:
        return None
    for keywords, label, url in IMAGE_RULES:
        for keyword in keywords:
            if keyword in haystack:
                return label, url
    return None


def is_legacy_or_mismatched(current: Optional[str], target_url: str) -> bool:
    if not current or not str(current).strip():
        return True
    value = str(current).strip()
    if value == target_url:
        return False
    if value.startswith("/") or value.startswith("./"):
        return True
    if re.search(r"^/media/", value, re.I):
        return True
    if "localhost" in value.lower():
        return True
    parsed = urlparse(value)
    if parsed.scheme in ("http", "https"):
        host = (parsed.hostname or "").lower()
        if host and "unsplash.com" not in host:
            return True
    return value != target_url


def connect(url: str):
    if psycopg2 is None:
        raise RuntimeError("Install psycopg2-binary: pip install psycopg2-binary python-dotenv")
    sslmode = "require" if "sslmode=require" in url.lower() else "prefer"
    return psycopg2.connect(url, sslmode=sslmode, cursor_factory=RealDictCursor)


def table_columns(conn, table: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            """,
            (table,),
        )
        return {str(row["column_name"]) for row in cur.fetchall()}


def fetch_active_tours(conn) -> list[dict]:
    cols = table_columns(conn, "tours")
    if "title" not in cols:
        raise RuntimeError("tours table is missing a title column")

    image_col = "image_url" if "image_url" in cols else ("image" if "image" in cols else None)
    select_bits = ["id", "title"]
    if image_col:
        select_bits.append(image_col)
    if "image" in cols and image_col != "image":
        select_bits.append("image")
    if "status" in cols:
        select_bits.append("status")
    if "published_at" in cols:
        select_bits.append("published_at")

    where = "WHERE title IS NOT NULL AND trim(title) <> ''"
    if "status" in cols:
        where += (
            " AND (status IS NULL OR trim(status) = '' "
            "OR status ILIKE '%publish%' OR status ILIKE '%active%')"
        )
    elif "published_at" in cols:
        where += " AND published_at IS NOT NULL"

    sql = f"SELECT {', '.join(select_bits)} FROM tours {where} ORDER BY id"
    with conn.cursor() as cur:
        cur.execute(sql)
        return list(cur.fetchall())


def update_tour_images(
    conn,
    tour_id,
    new_url: str,
    has_image_url: bool,
    has_image: bool,
    dry_run: bool,
) -> None:
    sets = []
    params: list = []
    if has_image_url:
        sets.append("image_url = %s")
        params.append(new_url)
    if has_image:
        sets.append("image = %s")
        params.append(new_url)
    if not sets:
        return
    params.append(tour_id)
    sql = f"UPDATE tours SET {', '.join(sets)} WHERE id = %s"
    if dry_run:
        return
    with conn.cursor() as cur:
        cur.execute(sql, params)


def run(apply: bool, limit: Optional[int]) -> int:
    dry_run = not apply
    url = load_database_url()
    conn = connect(url)

    try:
        cols = table_columns(conn, "tours")
        has_image_url = "image_url" in cols
        has_image = "image" in cols
        if not has_image_url and not has_image:
            print("No image_url or image column on tours — nothing to update.", file=sys.stderr)
            return 1

        tours = fetch_active_tours(conn)
        print(f"Loaded {len(tours)} active tour row(s) from Aiven.")

        matched = 0
        updated = 0
        skipped = 0

        for row in tours:
            if limit is not None and updated >= limit:
                break
            title = str(row.get("title") or "")
            hit = match_category(title)
            if not hit:
                skipped += 1
                continue
            category, target_url = hit
            matched += 1

            current = row.get("image_url") or row.get("image")
            if not is_legacy_or_mismatched(str(current) if current else None, target_url):
                skipped += 1
                continue

            updated += 1
            action = "UPDATE" if not dry_run else "DRY-RUN"
            print(
                f"[{action}] id={row['id']} | {category} | {title[:72]!r}\n"
                f"  old: {current}\n"
                f"  new: {target_url}"
            )
            update_tour_images(
                conn,
                row["id"],
                target_url,
                has_image_url,
                has_image,
                dry_run=dry_run,
            )

        if not dry_run:
            conn.commit()
            print(f"Committed {updated} tour image update(s).")
        else:
            print(
                f"Dry run complete — {matched} title match(es), {updated} would be updated. "
                "Re-run with --apply to write."
            )
        print(f"Skipped (no keyword / already correct): {skipped}")
        return 0
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Replace mismatched tour images with Unsplash CDN URLs.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to the database (default is dry-run only).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max number of tours to update (for testing).",
    )
    args = parser.parse_args()
    raise SystemExit(run(apply=args.apply, limit=args.limit))


if __name__ == "__main__":
    main()
