import { getRecordTitle, pickStoredString } from '@/lib/data';
import { parkSlug, stayMatchesParkLoose, stayParkFields } from '@/lib/park-stay-match';
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
function parkNameMentionedIn(text: string): string {
  const match = String(text || '').match(
    /\b([A-Za-z][A-Za-z0-9'’.\- ]{2,70}?(?:National Park|National Reserve|Game Reserve|Conservation Area))\b/
  );
  return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

export function stayParkLabelFromRecord(stay: RecordRow, parks: RecordRow[] = []): string {
  const fromFields =
    stayParkFields(stay)[0] ||
    pickStoredString(stay, ['national_park', 'national_park_name', 'park', 'park_name']);
  if (fromFields) return resolveParkSelectValue(fromFields, parks);

  const id = String(stay.national_park_id || '').trim();
  if (id) {
    const match = parks.find((park) => String(park.id || '') === id);
    if (match) return parkOptionValue(match);
  }
  return '';
}

/** Resolve park row from explicit fields, id, or location text (longest name wins). */
export function inferParkForStay(stay: RecordRow, parks: RecordRow[]): RecordRow | null {
  const label = stayParkLabelFromRecord(stay, parks);
  if (label) return findParkBySelectValue(label, parks);

  const id = String(stay.national_park_id || '').trim();
  if (id) {
    const byId = parks.find((park) => String(park.id || '') === id);
    if (byId) return byId;
  }

  const sorted = [...parks].sort((a, b) => parkOptionValue(b).length - parkOptionValue(a).length);
  for (const park of sorted) {
    const name = parkOptionValue(park);
    if (stayMatchesParkLoose(stay, name, String(park.id || ''))) return park;
  }
  return null;
}

/** Label for public meta bars — never returns empty when a park can be inferred. */
export function accommodationNationalParkDisplay(
  stay: RecordRow | null | undefined,
  parks: RecordRow[] = []
): string {
  if (!stay) return '';
  const explicit = stayParkLabelFromRecord(stay, parks);
  if (explicit) return explicit;
  const park = inferParkForStay(stay, parks);
  if (park) return parkOptionValue(park);
  const text = [pickStoredString(stay, ['location']), pickStoredString(stay, ['description', 'content'])]
    .filter(Boolean)
    .join(' ')
    .replace(/<[^>]+>/g, ' ');
  const mentioned = parkNameMentionedIn(text);
  return mentioned ? resolveParkSelectValue(mentioned, parks) : '';
}

/** Fills national_park_* on the row when inference finds a park but columns were empty. */
export function enrichAccommodationParkFields(stay: RecordRow, parks: RecordRow[]): RecordRow {
  if (stayParkLabelFromRecord(stay, parks)) return stay;
  const park = inferParkForStay(stay, parks);
  if (!park) return stay;
  return { ...stay, ...accommodationParkPayload(park, parkOptionValue(park)) };
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
