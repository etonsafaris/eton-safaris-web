import { getPublicRecordImage, getRecordImageRaw } from '@/lib/content-image';
import { resolvePublicRecordImageSrc } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** Normalize list rows so cards always read a single resolved `image_url`. */
export function enrichTourRowForCards(row: RecordRow): RecordRow {
  if (!row || typeof row !== 'object') return row;
  const resolved = getPublicRecordImage(row);
  if (resolved) {
    return row.image_url === resolved ? row : { ...row, image_url: resolved };
  }
  const raw = getRecordImageRaw(row);
  if (!raw) return row;
  const fallback = resolvePublicRecordImageSrc(raw);
  if (fallback) return { ...row, image_url: fallback };
  return row;
}

export function enrichTourListForCards(rows: RecordRow[]): RecordRow[] {
  return (rows ?? []).map(enrichTourRowForCards);
}

export function sortToursWithImagesFirst(rows: RecordRow[]): RecordRow[] {
  const withImage: RecordRow[] = [];
  const without: RecordRow[] = [];
  for (const row of rows ?? []) {
    if (getPublicRecordImage(row)) withImage.push(row);
    else without.push(row);
  }
  return [...withImage, ...without];
}
