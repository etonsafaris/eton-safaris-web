import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { destinationIso } from '@/lib/destination-chips';
import { canonicalCountrySlug, publicCountrySlug } from '@/lib/country-utils';
import { isPublishedRecord, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export type PublicDestination = {
  name: string;
  slug: string;
  iso: string;
};

const SEEDED_DESTINATIONS: PublicDestination[] = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].map((item) => ({
  name: item.name,
  slug: item.slug,
  iso: item.iso,
}));

const NAV_SLUGS = new Set(NAV_COUNTRIES.map((item) => item.slug));

export function seededDestinations(): PublicDestination[] {
  return SEEDED_DESTINATIONS.map((item) => ({ ...item }));
}

function countryDisplayName(row: RecordRow): string {
  const name = pickString(row, ['name']);
  if (name.length >= 2) return name;
  const title = pickString(row, ['title', 'label', 'country', 'destination']);
  if (title.length >= 3) return title;
  return name || title;
}

export function publicDestinationFromRecord(row: RecordRow): PublicDestination | null {
  const name = countryDisplayName(row);
  let slug = publicCountrySlug(row);
  if (!slug && name) slug = canonicalCountrySlug(name);
  // Never publish ultra-short junk slugs when a usable name slug exists.
  if (slug && slug.length < 3 && name) {
    const fromName = canonicalCountrySlug(name);
    if (fromName.length >= 3) slug = fromName;
  }
  if (!name || !slug || slug.length < 2) return null;
  const iso =
    pickString(row, ['iso', 'iso_code', 'country_code']).toLowerCase() || destinationIso(name) || destinationIso(slug) || '';
  return { name, slug, iso };
}

/** CMS + seeded destinations for header, footer, index, and home carousel. */
export function mergePublicDestinations(records: RecordRow[]): PublicDestination[] {
  const cms = new Map<string, PublicDestination>();
  for (const row of records.filter(isPublishedRecord)) {
    const dest = publicDestinationFromRecord(row);
    if (!dest) continue;
    // Prefer the first solid match; later rows with the same slug only fill missing iso.
    const existing = cms.get(dest.slug);
    if (!existing) {
      cms.set(dest.slug, dest);
    } else if (!existing.iso && dest.iso) {
      cms.set(dest.slug, { ...existing, iso: dest.iso });
    }
  }

  const used = new Set<string>();
  const primary: PublicDestination[] = [];
  for (const item of NAV_COUNTRIES) {
    const dest = cms.get(item.slug) || { name: item.name, slug: item.slug, iso: item.iso };
    primary.push({ ...dest, iso: dest.iso || item.iso });
    used.add(item.slug);
  }

  // All remaining CMS countries (Morocco, Seychelles, Mozambique, …) then seeded "other".
  const more: PublicDestination[] = [];
  for (const dest of cms.values()) {
    if (used.has(dest.slug)) continue;
    more.push(dest);
    used.add(dest.slug);
  }
  for (const item of OTHER_DESTINATIONS) {
    if (used.has(item.slug)) continue;
    more.push({ name: item.name, slug: item.slug, iso: item.iso });
    used.add(item.slug);
  }

  more.sort((a, b) => a.name.localeCompare(b.name));
  return [...primary, ...more];
}

export function splitNavDestinations(all: PublicDestination[]) {
  return {
    primary: all.filter((item) => NAV_SLUGS.has(item.slug)),
    more: all.filter((item) => !NAV_SLUGS.has(item.slug)),
  };
}

export function publicDestinationNames(all: PublicDestination[]): string[] {
  return all.map((item) => item.name);
}

export function destinationListingRows(records: RecordRow[]): RecordRow[] {
  return mergePublicDestinations(records).map((dest) => {
    const match = records.find((row) => {
      if (!isPublishedRecord(row)) return false;
      return publicDestinationFromRecord(row)?.slug === dest.slug;
    });
    return match || { name: dest.name, title: dest.name, slug: dest.slug };
  });
}
