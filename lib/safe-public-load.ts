import type { RecordRow } from '@/lib/types';

export function logPublicLoadWarning(scope: string, error: unknown, detail?: string) {
  const msg = error instanceof Error ? error.message : String(error);
  console.warn(`[Public] ${scope}${detail ? ` (${detail})` : ''}:`, msg);
}

export async function safePublicLoad<T>(
  scope: string,
  loader: () => Promise<T>,
  fallback: T,
  detail?: string
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    logPublicLoadWarning(scope, error, detail);
    return fallback;
  }
}

export const EMPTY_COUNTRY_PAGE = {
  country: null as RecordRow | null,
  categories: [] as RecordRow[],
  tours: [] as RecordRow[],
  parks: [] as RecordRow[],
  places: [] as RecordRow[],
};

export const EMPTY_TOUR_DETAIL = { tour: null as RecordRow | null, related: [] as RecordRow[] };
export const EMPTY_PARK_DETAIL = {
  park: null as RecordRow | null,
  others: [] as RecordRow[],
  stays: [] as RecordRow[],
};
export const EMPTY_STAY_DETAIL = {
  item: null as RecordRow | null,
  others: [] as RecordRow[],
  tours: [] as RecordRow[],
};
export const EMPTY_SAFARI_UPDATE_DETAIL = {
  post: null as RecordRow | null,
  related: [] as RecordRow[],
  tours: [] as RecordRow[],
};
export const EMPTY_EXPLORE_DETAIL = {
  place: null as RecordRow | null,
  others: [] as RecordRow[],
  tours: [] as RecordRow[],
};
