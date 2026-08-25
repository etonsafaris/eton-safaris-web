'use client';

import { useEffect, useRef, useState } from 'react';
import { pickRecordId, recordPublishedAt } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export type EnsurePublishedTable =
  | 'categories'
  | 'countries'
  | 'tours'
  | 'national_park'
  | 'explore'
  | 'accommodations'
  | 'safari_updates'
  | 'pages';

/**
 * Returns a published date for a CMS row, backfilling via API when legacy rows have none.
 * `fallback` is display-only (e.g. parent country date) and does not skip the backfill.
 */
export function useEnsurePublishedAt(
  table: EnsurePublishedTable,
  record: RecordRow | null | undefined,
  fallback = '',
  onStamp?: (stamp: string) => void
): string {
  const fromRecord = record ? recordPublishedAt(record) : '';
  const [override, setOverride] = useState('');
  const id = pickRecordId(record);
  const onStampRef = useRef(onStamp);
  onStampRef.current = onStamp;

  useEffect(() => {
    setOverride('');
    if (id == null || fromRecord) return undefined;

    let cancelled = false;
    fetch('/api/public/ensure-published-at', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id }),
    })
      .then((response) => response.json())
      .then((body: { published_at?: string }) => {
        if (cancelled || !body.published_at) return;
        const stamp = String(body.published_at);
        setOverride(stamp);
        onStampRef.current?.(stamp);
      })
      .catch((error) => console.warn('[Published date] Could not backfill stamp:', error));

    return () => {
      cancelled = true;
    };
  }, [table, id, fromRecord]);

  return override || fromRecord || fallback.trim();
}
