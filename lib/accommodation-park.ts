import { getRecordTitle } from '@/lib/data';
import { parkSlug, stayParkFields } from '@/lib/park-stay-match';
import type { RecordRow } from '@/lib/types';

export function parkOptionValue(park: RecordRow): string {
  return getRecordTitle(park);
}

/** Match stored stay park text to a park row for the dropdown value. */
export function resolveParkSelectValue(raw: string, parks: RecordRow[]): string {
  const needle = String(raw || '').trim();
  if (!needle || parks.length === 0) return needle;

  const exact = parks.find((park) => parkOptionValue(park) === needle);
  if (exact) return parkOptionValue(exact);

  const needleSlug = parkSlug(needle);
  for (const park of parks) {
    const title = parkOptionValue(park);
    if (title.toLowerCase() === needle.toLowerCase()) return title;
    if (needleSlug && parkSlug(title) === needleSlug) return title;
  }

  const stayId = needle;
  const byId = parks.find((park) => String(park.id || '') === stayId);
  if (byId) return parkOptionValue(byId);

  return needle;
}

export function findParkBySelectValue(value: string, parks: RecordRow[]): RecordRow | null {
  const resolved = resolveParkSelectValue(value, parks);
  if (!resolved) return null;
  return parks.find((park) => parkOptionValue(park) === resolved) || null;
}

export function accommodationParkPayload(park: RecordRow | null, parkLabel: string): Record<string, string> {
  const name = (park ? parkOptionValue(park) : parkLabel).trim();
  if (!name) return {};
  const fields: Record<string, string> = {
    national_park: name,
    national_park_name: name,
    park: name,
    park_name: name,
  };
  if (park?.id != null) fields.national_park_id = String(park.id);
  return fields;
}

/** Prefer explicit park columns; fall back to national_park_id on the stay row. */
export function stayParkLabelFromRecord(stay: RecordRow, parks: RecordRow[] = []): string {
  const fromFields = stayParkFields(stay)[0];
  if (fromFields) return resolveParkSelectValue(fromFields, parks);

  const id = String(stay.national_park_id || '').trim();
  if (id) {
    const match = parks.find((park) => String(park.id || '') === id);
    if (match) return parkOptionValue(match);
  }
  return '';
}

export function ensureStayLocationInPark(location: string, parkName: string, country: string): string {
  const loc = String(location || '').trim();
  const park = String(parkName || '').trim();
  if (!park) return loc;
  if (!loc) return country ? `${park}, ${country}` : park;
  const shortPark = park.replace(/\s+(National Park|National Reserve|Game Reserve)$/i, '').trim();
  const hay = loc.toLowerCase();
  if (hay.includes(park.toLowerCase())) return loc;
  if (shortPark.length >= 4 && hay.includes(shortPark.toLowerCase())) return loc;
  return `${park}, ${loc}`;
}
