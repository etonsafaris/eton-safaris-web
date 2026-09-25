import {
  fetchCollectionRecordById,
  fetchPublicSafariUpdatesPage,
  fetchRecordByPublicSlug,
  filterPublicSafariUpdates,
  isLanguagePost,
  isPublishedRecord,
  publicRecordSlug,
} from '@/lib/data-server';
import { normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

async function fetchSafariUpdateBySlugResilient(slug: string): Promise<RecordRow | null> {
  const first = await fetchRecordByPublicSlug('safari_updates', slug).catch(() => null);
  if (first) return first;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return await fetchRecordByPublicSlug('safari_updates', slug).catch(() => null);
}

async function hydrateSafariUpdate(row: RecordRow | null): Promise<RecordRow | null> {
  if (!row?.id) return row;
  try {
    const full = await fetchCollectionRecordById('safari_updates', String(row.id));
    if (full && isPublishedRecord(full) && !isLanguagePost(full)) return full;
  } catch {
    // keep list row
  }
  return row;
}

function isPublicSafariPost(row: RecordRow | null | undefined) {
  return Boolean(row && isPublishedRecord(row) && !isLanguagePost(row));
}

async function findInSafariListing(slug: string, scanLimit = 96): Promise<RecordRow | null> {
  const needle = normalizeSlug(slug);
  if (!needle) return null;
  for (const limit of [48, scanLimit]) {
    try {
      const page = await fetchPublicSafariUpdatesPage({ limit, offset: 0 });
      const match =
        filterPublicSafariUpdates(page.rows).find((row) => {
          const rowSlug = normalizeSlug(publicRecordSlug(row) || '');
          return rowSlug === needle || String(row.id ?? '') === slug;
        }) || null;
      if (match) return await hydrateSafariUpdate(match);
    } catch {
      // try larger scan
    }
  }
  return null;
}

/** Resolve a safari update by slug with retries and listing fallback (never relies on a single query). */
export async function resolveSafariUpdatePost(slug: string): Promise<RecordRow | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;

  const attempts = [normalized, slug].filter((value, index, all) => value && all.indexOf(value) === index);
  for (const attempt of attempts) {
    const direct = await fetchSafariUpdateBySlugResilient(attempt);
    if (isPublicSafariPost(direct)) return await hydrateSafariUpdate(direct);
  }

  const fromListing = await findInSafariListing(normalized);
  if (isPublicSafariPost(fromListing)) return fromListing;

  return null;
}
