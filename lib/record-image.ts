import type { RecordRow } from '@/lib/types';

/** Pure helpers — safe to import from client components (no data-server / pg). */
export function getRecordImage(record: RecordRow | null | undefined): string | null {
  if (!record || typeof record !== 'object') return null;
  const preferred = [
    'image_url',
    'cover_image',
    'featured_image',
    'thumbnail',
    'photo',
    'banner',
    'picture',
    'social_image_url',
  ];
  for (const key of preferred) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
