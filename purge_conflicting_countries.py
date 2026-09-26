#!/usr/bin/env python3
"""
Purge conflicting country image URLs in Aiven PostgreSQL and align CMS rows with
official bundled hero assets (same paths as lib/official-country-assets.ts).

Install driver (once):
  pip install psycopg2-binary

Usage:
  python purge_conflicting_countries.py              # dry-run (report only)
  python purge_conflicting_countries.py --execute    # apply UPDATEs + optional media cleanup
  python purge_conflicting_countries.py --execute --purge-orphan-media

Reads DATABASE_URL from .env.local in the project root (or environment).
"""

from __future__ import annotations

import argparse
import json
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

# Canonical paths — keep in sync with lib/official-country-assets.ts
OFFICIAL_COUNTRY_HERO_PATHS: dict[str, str] = {
    "uganda": "/heroes/uganda.jpg",
    "kenya": "/heroes/kenya.jpg",
    "tanzania": "/heroes/tanzania.jpg",
    "rwanda": "/heroes/rwanda.webp",
    "botswana": "/heroes/botswana.jpg",
    "egypt": "/heroes/egypt.webp",
    "namibia": "/heroes/namibia.jpg",
    "south-africa": "/heroes/south-africa.webp",
    "dr-congo": "/heroes/dr-congo.jpg",
    "ethiopia": "/heroes/ethiopia.jpg",
    "malawi": "/heroes/malawi.webp",
    "zambia": "/heroes/zambia.webp",
}

COMMUNITY_HERO_MARKERS = (
    "/heroes/community",
    "/heroes/talk-to-us",
)

CONFLICT_MARKERS = (
    "eton-safaris-gorilla",
    "images.unsplash.com",
    "media.base44.com",
    "images.pexels.com",
    "/heroes/egypt-1440",
    "/heroes/community-conservation",
    "/heroes/community-tourism",
    "/heroes/community-employment",
    "/heroes/community-hero",
)

COUNTRY_IMAGE_COLUMNS = (
    "image_url",
    "cover_image",
    "featured_image",
    "social_image_url",
    "thumbnail",
    "photo",
    "banner",
    "image",
)

CONTENT_TABLES = (
    "countries",
    "tours",
    "categories",
    "national_park",
    "accommodations",
    "explore",
    "pages",
    "landing_pages",
    "safari_updates",
    "keywords",
    "reviews",
)

MEDIA_ID_RE = re.compile(r"/api/media/([a-f0-9]{32})", re.I)
CMS_MEDIA_RE = re.compile(r"/cms-media/([a-f0-9]{32})", re.I)


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


def normalize_slug(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def path_only(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    if raw.startswith("/"):
        return raw.split("?")[0]
    try:
        return urlparse(raw).path.split("?")[0]
    except Exception:
        return raw.split("?")[0]


def official_for_slug(slug: str) -> str | None:
    key = normalize_slug(slug)
    return OFFICIAL_COUNTRY_HERO_PATHS.get(key)


def is_conflicting_value(slug: str, value: Any) -> bool:
    if value is None:
        return True
    text = str(value).strip()
    if not text or text.lower() in ("null", "undefined", "none", "-"):
        return True

    lower = text.lower()
    for marker in CONFLICT_MARKERS:
        if marker in lower:
            return True
    for marker in COMMUNITY_HERO_MARKERS:
        if marker in lower:
            return True

    pathname = path_only(text)
    official = official_for_slug(slug)
    if not official:
        return False

    if pathname.startswith("/heroes/"):
        return pathname != official

    return False


def resolve_row_slug(row: dict[str, Any]) -> str:
    for key in ("slug", "seo_slug", "country_slug", "name", "title"):
        raw = row.get(key)
        if raw:
            slug = normalize_slug(str(raw))
            if slug in OFFICIAL_COUNTRY_HERO_PATHS:
                return slug
            if slug.endswith("-safaris"):
                slug = slug[: -len("-safaris")]
            if slug in OFFICIAL_COUNTRY_HERO_PATHS:
                return slug
    return ""


def existing_columns(cur, table: str) -> set[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table,),
    )
    return {r[0] for r in cur.fetchall()}


def collect_media_ids(value: Any, into: set[str]) -> None:
    if value is None:
        return
    if isinstance(value, str):
        for pattern in (MEDIA_ID_RE, CMS_MEDIA_RE):
            for match in pattern.finditer(value):
                into.add(match.group(1).lower())
        return
    if isinstance(value, dict):
        for item in value.values():
            collect_media_ids(item, into)
        return
    if isinstance(value, (list, tuple)):
        for item in value:
            collect_media_ids(item, into)


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge conflicting country image URLs in Aiven.")
    parser.add_argument("--execute", action="store_true", help="Apply UPDATE statements (default: dry-run).")
    parser.add_argument(
        "--purge-orphan-media",
        action="store_true",
        help="With --execute: DELETE media_files rows not referenced in CMS content.",
    )
    parser.add_argument(
        "--force-official",
        action="store_true",
        help="Set image_url to official path for every mapped country (even valid Cloudinary URLs).",
    )
    args = parser.parse_args()

    load_env_local()
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL is not set (.env.local or environment).", file=sys.stderr)
        return 1

    conn = psycopg2.connect(database_url, sslmode="require")
    conn.autocommit = False
    report: dict[str, Any] = {
        "mode": "execute" if args.execute else "dry-run",
        "countries_scanned": 0,
        "countries_updated": 0,
        "column_updates": 0,
        "samples": [],
    }

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SET statement_timeout = 120000")

            if not existing_columns(cur, "countries"):
                print("Table `countries` not found.", file=sys.stderr)
                return 1

            cols = existing_columns(cur, "countries")
            image_cols = [c for c in COUNTRY_IMAGE_COLUMNS if c in cols]
            if "image_url" not in image_cols and "image" in image_cols:
                image_cols.insert(0, "image")
            if not image_cols:
                print("No image columns found on countries table.", file=sys.stderr)
                return 1

            select_cols = ["id", "slug", "name", "title"] + image_cols
            cur.execute(f"SELECT {', '.join(select_cols)} FROM countries")
            rows = cur.fetchall()
            report["countries_scanned"] = len(rows)

            updates: list[tuple[str, dict[str, str]]] = []

            for row in rows:
                slug = resolve_row_slug(row)
                official = official_for_slug(slug)
                if not official:
                    continue

                patch: dict[str, str] = {}
                for col in image_cols:
                    current = row.get(col)
                    needs = args.force_official or is_conflicting_value(slug, current)
                    if not needs:
                        continue
                    if str(current or "").strip() == official:
                        continue
                    patch[col] = official

                if patch:
                    updates.append((str(row["id"]), patch))
                    if len(report["samples"]) < 12:
                        report["samples"].append(
                            {
                                "id": row["id"],
                                "slug": slug,
                                "official": official,
                                "patch": patch,
                                "before": {k: row.get(k) for k in patch},
                            }
                        )

            report["countries_updated"] = len(updates)
            report["column_updates"] = sum(len(p) for _, p in updates)

            if args.execute and updates:
                for row_id, patch in updates:
                    sets = ", ".join(f"{col} = %s" for col in patch)
                    cur.execute(
                        f"UPDATE countries SET {sets} WHERE id::text = %s",
                        list(patch.values()) + [row_id],
                    )
                conn.commit()
            elif updates:
                conn.rollback()
            else:
                conn.commit()

            if args.execute and args.purge_orphan_media and existing_columns(cur, "media_files"):
                referenced: set[str] = set()
                for table in CONTENT_TABLES:
                    if table not in existing_columns(cur, table):
                        continue
                    try:
                        cur.execute(f"SELECT * FROM {table}")
                        for content_row in cur.fetchall():
                            collect_media_ids(dict(content_row), referenced)
                    except Exception as exc:
                        print(f"Skip scan {table}: {exc}", file=sys.stderr)

                cur.execute("SELECT id FROM media_files")
                all_ids = {str(r["id"]).lower() for r in cur.fetchall()}
                orphan = sorted(all_ids - referenced)
                report["media_files_total"] = len(all_ids)
                report["media_files_referenced"] = len(referenced)
                report["media_files_orphan_deleted"] = len(orphan)
                if orphan:
                    for i in range(0, len(orphan), 100):
                        chunk = orphan[i : i + 100]
                        cur.execute("DELETE FROM media_files WHERE id = ANY(%s)", (chunk,))
                    conn.commit()

        print(json.dumps(report, indent=2))
        if not args.execute and updates:
            print("\nRe-run with --execute to apply changes.")
        return 0
    except Exception as exc:
        conn.rollback()
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
