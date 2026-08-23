import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { destinationIso } from '@/lib/destination-chips';
import { publicCountrySlug } from '@/lib/country-utils';
import { getRecordTitle, isPublishedRecord, pickString } from '@/lib/data';
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

export function publicDestinationFromRecord(row: RecordRow): PublicDestination | null {
  const name = getRecordTitle(row);
  const slug = publicCountrySlug(row);
  if (!name || !slug) return null;
  const iso =
    pickString(row, ['iso', 'iso_code', 'country_code']).toLowerCase() || destinationIso(name) || '';
  return { name, slug, iso };
}

export function mergePublicDestinations(records: RecordRow[]): PublicDestination[] {
  const cms = new Map<string, PublicDestination>();
  for (const row of records.filter(isPublishedRecord)) {
    const dest = publicDestinationFromRecord(row);
    if (dest) cms.set(dest.slug, dest);
  }

  const used = new Set<string>();
  const primary: PublicDestination[] = [];
  for (const item of NAV_COUNTRIES) {
    const dest = cms.get(item.slug) || { name: item.name, slug: item.slug, iso: item.iso };
    primary.push({ ...dest, iso: dest.iso || item.iso });
    used.add(item.slug);
  }

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
    const match = records.find((row) => publicDestinationFromRecord(row)?.slug === dest.slug);
    return match || { name: dest.name, title: dest.name, slug: dest.slug };
  });
}
