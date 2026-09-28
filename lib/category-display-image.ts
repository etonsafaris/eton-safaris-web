import { getRecordTitle } from '@/lib/data';
import { getRecordImage } from '@/lib/record-image';
import type { RecordRow } from '@/lib/types';

const CARD_UNSPLASH_PARAMS = 'auto=format&fit=crop&w=600&q=80';

function cardPhoto(photoId: string): string {
  const id = photoId.startsWith('photo-') ? photoId : `photo-${photoId}`;
  return `https://images.unsplash.com/${id}?${CARD_UNSPLASH_PARAMS}`;
}

/** Curated tourism art for safari activity categories (logo-free, CDN-sized for cards). */
export const CATEGORY_STOCK_IMAGES: { pattern: RegExp; url: string }[] = [
  {
    pattern: /gorilla(\s+trekking)?/i,
    url: cardPhoto('1523805009345-744884127a0'),
  },
  {
    pattern: /wildlife(\s+safaris?)?/i,
    url: cardPhoto('1516426122078-c23e9931aeeb'),
  },
  {
    pattern: /chimp(anzee)?(\s+tracking)?/i,
    url: cardPhoto('1551969014-7d9720413452'),
  },
  {
    pattern: /bird(ing)?(\s+tours?)?/i,
    url: cardPhoto('1444464666168-49d633b86797'),
  },
  {
    pattern: /mountain(\s+climbing)?|kilimanjaro|rwenzori/i,
    url: cardPhoto('1464822759023-fed622ff2c3b'),
  },
  {
    pattern: /cultural(\s+tours?)?/i,
    url: cardPhoto('1489392191929-878962fa5fcc'),
  },
  {
    pattern: /safari/i,
    url: cardPhoto('1516026672272-bc52d61a55d9'),
  },
];

export const DEFAULT_CATEGORY_CARD_IMAGE = cardPhoto('1516426122078-c23e9931aeeb');

const BROKEN_MARKERS = [
  'eton-safaris-gorilla',
  'media.base44.com',
  '/object/authenticated/',
  '/object/sign/',
  'placeholder',
  'via.placeholder',
];

export function isBrokenCategoryImageUrl(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text || /^(null|undefined|none|-)$/i.test(text)) return true;
  const lower = text.toLowerCase();
  for (const marker of BROKEN_MARKERS) {
    if (lower.includes(marker)) return true;
  }
  if (/^\/(media|uploads)\//i.test(text)) return true;
  if (text.startsWith('/') && !text.startsWith('/heroes/') && !text.startsWith('//')) {
    if (!text.startsWith('/api/media/')) return true;
  }
  return false;
}

export function stockImageForCategoryLabel(label: string): string {
  const haystack = label.trim();
  if (!haystack) return DEFAULT_CATEGORY_CARD_IMAGE;
  for (const { pattern, url } of CATEGORY_STOCK_IMAGES) {
    if (pattern.test(haystack)) return url;
  }
  return DEFAULT_CATEGORY_CARD_IMAGE;
}

/** Prefer valid CMS URL; otherwise keyword-matched Unsplash stock (never the brand logo). */
export function resolveCategoryDisplayImage(category: RecordRow | null | undefined): string {
  if (!category) return DEFAULT_CATEGORY_CARD_IMAGE;
  const title = getRecordTitle(category);
  const raw = getRecordImage(category);
  if (raw && !isBrokenCategoryImageUrl(raw)) {
    if (/images\.unsplash\.com/i.test(raw)) return raw.split('?')[0] + `?${CARD_UNSPLASH_PARAMS}`;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/media/') || raw.startsWith('/heroes/')) {
      return raw;
    }
  }
  return stockImageForCategoryLabel(title);
}

export const CATEGORY_THUMB_WIDTH = 320;
export const CATEGORY_THUMB_HEIGHT = 130;
