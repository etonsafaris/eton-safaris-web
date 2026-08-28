'use client';

import { recordPublishedAt } from '@/lib/data';
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
 * Display-only published date — never writes to Supabase from a public page view.
 * Admin saves set published_at explicitly; scripts must not change publish status.
 */
export function useEnsurePublishedAt(
  _table: EnsurePublishedTable,
  record: RecordRow | null | undefined,
  fallback = '',
  _onStamp?: (stamp: string) => void
): string {
  const fromRecord = record ? recordPublishedAt(record) : '';
  return fromRecord || fallback.trim();
}
