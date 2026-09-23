import type { RecordRow } from '@/lib/types';

function pickField(record: RecordRow | Record<string, unknown>, keys: string[]) {
  const row = record as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

/** Same slug rules as CMS / seed scripts — used to match stays to parks. */
export function parkSlug(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-national-park|-national-reserve|-game-reserve|-conservation-area|-nature-reserve|-protected-area|-protectorate/g, '');
}

export function stayParkFields(stay: RecordRow | Record<string, unknown>) {
  return [
    pickField(stay, ['national_park', 'national_park_name', 'park', 'park_name']),
  ]
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * True only when the stay is explicitly linked to this park (not via loose location text).
 */
export function stayMatchesPark(
  stay: RecordRow | Record<string, unknown>,
  parkName: string,
  parkId?: string
): boolean {
  const id = String(parkId || '').trim();
  if (id && String((stay as RecordRow).national_park_id || '').trim() === id) {
    return true;
  }

  const targetSlug = parkSlug(parkName);
  if (!targetSlug) return false;

  const fields = stayParkFields(stay);
  if (fields.length === 0) return false;

  for (const field of fields) {
    const fieldSlug = parkSlug(field);
    if (!fieldSlug) continue;
    if (fieldSlug === targetSlug) return true;
    if (fieldSlug.length >= 10 && targetSlug.length >= 10) {
      if (fieldSlug.includes(targetSlug) || targetSlug.includes(fieldSlug)) return true;
    }
  }
  return false;
}

/** When park columns are empty, allow location text that names this park (not lodge name). */
export function stayMatchesParkLoose(
  stay: RecordRow | Record<string, unknown>,
  parkName: string,
  parkId?: string
): boolean {
  if (stayMatchesPark(stay, parkName, parkId)) return true;
  const loc = pickField(stay, ['location']).toLowerCase();
  if (!loc) return false;
  const full = String(parkName || '').trim().toLowerCase();
  const short = full
    .replace(/\s+national\s+park$/i, '')
    .replace(/\s+national\s+reserve$/i, '')
    .replace(/\s+conservation\s+area$/i, '')
    .trim();
  if (full && loc.includes(full)) return true;
  if (short.length >= 10 && loc.includes(short)) return true;
  return false;
}
