import { canonicalCountrySlug, filterToursByCategory } from '@/lib/country-utils';
import { countryCardRemoteFallback, defaultSafariStockImage } from '@/lib/country-hero-fallback';
import { getRecordTitle } from '@/lib/data';
import { getRecordImage } from '@/lib/record-image';
import type { RecordRow } from '@/lib/types';

const CARD_UNSPLASH_PARAMS = 'auto=format&fit=crop&w=600&q=80';

/** Curated tourism art for safari activity categories (logo-free, CDN-sized for cards). */
export const CATEGORY_STOCK_IMAGES: { pattern: RegExp; url: string }[] = [
  {
    pattern: /gorilla(\s+trekking)?/i,
    url: countryCardRemoteFallback('uganda'),
  },
  {
    pattern: /wildlife(\s+safaris?)?/i,
    url: countryCardRemoteFallback('kenya'),
  },
  {
    pattern: /chimp(anzee)?(\s+tracking)?/i,
    url: countryCardRemoteFallback('rwanda'),
  },
  {
    pattern: /bird(ing)?(\s+tours?)?/i,
    url: countryCardRemoteFallback('malawi'),
  },
  {
    pattern: /mountain(\s+climbing)?|kilimanjaro|rwenzori/i,
    url: countryCardRemoteFallback('ethiopia'),
  },
  {
    pattern: /cultural(\s+tours?)?/i,
    url: countryCardRemoteFallback('morocco'),
  },
  {
    pattern: /safari/i,
    url: countryCardRemoteFallback('tanzania'),
  },
];

export const DEFAULT_CATEGORY_CARD_IMAGE = defaultSafariStockImage();

/** When category keywords do not match, prefer a country-appropriate safari scene. */
const COUNTRY_ECOSYSTEM_CARD_IMAGES: Record<string, string> = {
  uganda: countryCardRemoteFallback('uganda'),
  kenya: countryCardRemoteFallback('kenya'),
  tanzania: countryCardRemoteFallback('tanzania'),
  rwanda: countryCardRemoteFallback('rwanda'),
  'dr-congo': countryCardRemoteFallback('dr-congo'),
  'south-africa': countryCardRemoteFallback('south-africa'),
  botswana: countryCardRemoteFallback('botswana'),
  zambia: countryCardRemoteFallback('zambia'),
};

/** Unsplash IDs we inject as category/country stock — skip for tour cards when hunting for real uploads. */
const STOCK_UNSPLASH_PHOTO_IDS = new Set(
  [
    ...CATEGORY_STOCK_IMAGES.map((item) => item.url),
    ...Object.values(COUNTRY_ECOSYSTEM_CARD_IMAGES),
    DEFAULT_CATEGORY_CARD_IMAGE,
  ]
    .map((url) => {
      const match = url.match(/\/photo-([a-z0-9-]+)/i) || url.match(/\/([a-z0-9-]+)\?/i);
      return match?.[1]?.replace(/^photo-/, '') || '';
    })
    .filter(Boolean)
);

export function isGenericStockUnsplashUrl(value: string | null | undefined): boolean {
  if (!value || !/images\.unsplash\.com/i.test(value)) return false;
  const id =
    value.match(/\/photo-([a-z0-9-]+)/i)?.[1] ||
    value.match(/images\.unsplash\.com\/([a-z0-9-]+)/i)?.[1] ||
    '';
  const normalized = id.replace(/^photo-/, '');
  return normalized ? STOCK_UNSPLASH_PHOTO_IDS.has(normalized) : false;
}

export function stockImageForCountryCategory(countrySlug: string, categoryLabel: string): string {
  const fromLabel = stockImageForCategoryLabel(categoryLabel);
  if (fromLabel !== DEFAULT_CATEGORY_CARD_IMAGE) return fromLabel;
  const key = canonicalCountrySlug(countrySlug);
  if (key && COUNTRY_ECOSYSTEM_CARD_IMAGES[key]) return COUNTRY_ECOSYSTEM_CARD_IMAGES[key];
  return DEFAULT_CATEGORY_CARD_IMAGE;
}

function normalizeCardImageUrl(raw: string): string {
  if (/images\.unsplash\.com/i.test(raw)) return `${raw.split('?')[0]}?${CARD_UNSPLASH_PARAMS}`;
  return raw;
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
    if (/images\.unsplash\.com/i.test(raw)) return normalizeCardImageUrl(raw);
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/media/') || raw.startsWith('/heroes/')) {
      return raw;
    }
  }
  return stockImageForCategoryLabel(title);
}

/** Country category carousel: CMS → matching tour photo → keyword / ecosystem stock (never logo). */
export function resolveCountryCategoryCardImage(
  category: RecordRow | null | undefined,
  context?: { countrySlug?: string; tours?: RecordRow[] | null }
): string {
  try {
    if (!category) {
      return stockImageForCountryCategory(context?.countrySlug || '', '');
    }

    const title = getRecordTitle(category);
    const cmsRaw = getRecordImage(category);
    if (cmsRaw && !isBrokenCategoryImageUrl(cmsRaw)) {
      if (/images\.unsplash\.com/i.test(cmsRaw)) return normalizeCardImageUrl(cmsRaw);
      if (/^https?:\/\//i.test(cmsRaw) || cmsRaw.startsWith('/api/media/') || cmsRaw.startsWith('/heroes/')) {
        return cmsRaw;
      }
    }

    const tours = context?.tours ?? [];
    if (tours.length) {
      const inCategory = filterToursByCategory(tours, category);
      for (const tour of inCategory) {
        const tourImg = getRecordImage(tour);
        if (!tourImg || isBrokenCategoryImageUrl(tourImg)) continue;
        if (/images\.unsplash\.com/i.test(tourImg)) return normalizeCardImageUrl(tourImg);
        if (/^https?:\/\//i.test(tourImg) || tourImg.startsWith('/api/media/')) return tourImg;
      }
    }

    return stockImageForCountryCategory(context?.countrySlug || '', title);
  } catch {
    return stockImageForCountryCategory(context?.countrySlug || '', category ? getRecordTitle(category) : '');
  }
}

export const CATEGORY_THUMB_WIDTH = 320;
export const CATEGORY_THUMB_HEIGHT = 130;
