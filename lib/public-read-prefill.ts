import { publicRecordSlug } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const KEY_PREFIX = 'public-read-prefill:';

function storageKey(collectionId: string, slug: string) {
  return `${KEY_PREFIX}${collectionId}:${slug}`;
}

/** Keep list/card row in session so detail pages can render if a refetch fails. */
export function stashPublicReadRecord(collectionId: string, record: RecordRow) {
  if (typeof window === 'undefined') return;
  const slug = publicRecordSlug(record) || String(record.id ?? '').trim();
  if (!slug) return;
  try {
    sessionStorage.setItem(storageKey(collectionId, slug), JSON.stringify(record));
  } catch {
    // quota / private mode
  }
}

export function readPublicReadPrefill(collectionId: string, slug: string): RecordRow | null {
  if (typeof window === 'undefined') return null;
  const key = String(slug || '').trim();
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(collectionId, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecordRow;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
