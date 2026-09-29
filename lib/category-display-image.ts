import { canonicalCountrySlug, filterToursByCategory } from '@/lib/country-utils';
import { getRecordTitle } from '@/lib/data';
import { getRecordImage } from '@/lib/record-image';
import { resolvePublicCmsImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

/** @deprecated Public site no longer uses stock category art. */
export const CATEGORY_STOCK_IMAGES: { pattern: RegExp; url: string }[] = [];

export const DEFAULT_CATEGORY_CARD_IMAGE = '';

export function isGenericStockUnsplashUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /images\.unsplash\.com/i.test(String(value));
}

export function stockImageForCountryCategory(_countrySlug: string, _categoryLabel: string): string {
  return '';
}

export function stockImageForCategoryLabel(_label: string): string {
  return '';
}

const BROKEN_MARKERS = [
  'eton-safaris-gorilla',
  'media.base44.com',
  'supabase.co/storage',
  '/object/authenticated/',
  '/object/sign/',
  'placeholder',
  'via.placeholder',
];

export function isBrokenCategoryImageUrl(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text || /^(null|undefined|none|-)$/i.test(text)) return true;
  if (/^\/(?:api\/media|cms-media)\/[a-f0-9]{32}/i.test(text.split('?')[0])) return false;
  if (/images\.unsplash\.com/i.test(text)) return true;
  const lower = text.toLowerCase();
  for (const marker of BROKEN_MARKERS) {
    if (lower.includes(marker)) return true;
  }
  if (/^\/(media|uploads)\//i.test(text)) return true;
  if (text.startsWith('/heroes/')) return true;
  if (text.startsWith('/') && !text.startsWith('//')) {
    if (!/^\/(?:api\/media|cms-media)\//i.test(text)) return true;
  }
  return false;
}

function pickAdminImage(raw: string | null | undefined): string | null {
  if (!raw || isBrokenCategoryImageUrl(raw)) return null;
  return resolvePublicCmsImage(raw);
}

/** Admin CMS image on the category row only. */
export function resolveCategoryDisplayImage(category: RecordRow | null | undefined): string {
  if (!category) return '';
  return pickAdminImage(getRecordImage(category)) || '';
}

/** Category row image, else first matching tour upload from admin — never stock. */
export function resolveCountryCategoryCardImage(
  category: RecordRow | null | undefined,
  context?: { countrySlug?: string; tours?: RecordRow[] | null }
): string {
  try {
    if (!category) return '';

    const cms = pickAdminImage(getRecordImage(category));
    if (cms) return cms;

    const tours = context?.tours ?? [];
    if (tours.length) {
      const inCategory = filterToursByCategory(tours, category);
      for (const tour of inCategory) {
        const tourImg = pickAdminImage(getRecordImage(tour));
        if (tourImg) return tourImg;
      }
    }

    void canonicalCountrySlug(context?.countrySlug || '');
    return '';
  } catch {
    return '';
  }
}

export const CATEGORY_THUMB_WIDTH = 320;
export const CATEGORY_THUMB_HEIGHT = 130;
