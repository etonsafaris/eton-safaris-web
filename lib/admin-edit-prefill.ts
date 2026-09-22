import { pickRecordId } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const KEY_PREFIX = 'admin-edit-prefill:';

function storageKey(collectionId: string, recordId: string) {
  return `${KEY_PREFIX}${collectionId}:${recordId}`;
}

/** Pass list/grid row into the edit route so the form can render without waiting on the network. */
export function stashAdminEditRecord(
  collectionId: string,
  record: RecordRow,
  recordId?: string | number | null
) {
  if (typeof window === 'undefined') return;
  const id = recordId != null ? String(recordId) : pickRecordId(record);
  if (!id) return;
  try {
    sessionStorage.setItem(storageKey(collectionId, id), JSON.stringify(record));
  } catch {
    // private mode / quota
  }
}

export function readAdminEditPrefill(collectionId: string, recordId: string | number): RecordRow | null {
  if (typeof window === 'undefined') return null;
  const id = String(recordId ?? '').trim();
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(collectionId, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecordRow;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function hasAdminEditPrefill(collectionId: string, recordId: string | number): boolean {
  return Boolean(readAdminEditPrefill(collectionId, recordId));
}
