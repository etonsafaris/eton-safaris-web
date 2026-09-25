import type { RecordRow } from '@/lib/types';

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function pickSlug(row: RecordRow): string {
  const raw = row.slug ?? row.seo_slug ?? row.country_slug ?? '';
  return normalizeSlug(String(raw || ''));
}

/** Client-safe country row match (no data-server import). */
export function recordMatchesCountrySlug(row: RecordRow, slug: string): boolean {
  const needle = normalizeSlug(slug);
  if (!needle) return false;
  const rowSlug = pickSlug(row);
  if (!rowSlug) return false;
  if (rowSlug === needle) return true;
  if (rowSlug === `${needle}-safaris`) return true;
  if (`${rowSlug}-safaris` === needle) return true;
  return false;
}
