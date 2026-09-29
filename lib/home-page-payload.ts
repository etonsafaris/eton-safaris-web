import type { HomePageContent } from '@/lib/home-page-content';
import { DEFAULT_HOME_PAGE_CONTENT } from '@/lib/home-page-content';
import type { HomeHeroSlide } from '@/lib/home-hero-slides';
import { resolvePublicHeroCarouselImage } from '@/lib/public-image';
import type { RecordRow } from '@/lib/types';

export type HomePagePayload = {
  countries: RecordRow[];
  tours: RecordRow[];
  updates: RecordRow[];
  categories: RecordRow[];
};

export const EMPTY_HOME_PAGE_PAYLOAD: HomePagePayload = {
  countries: [],
  tours: [],
  updates: [],
  categories: [],
};

export function safeRecordRows(value: unknown): RecordRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row != null && typeof row === 'object') as RecordRow[];
}

export function normalizeHomePagePayload(partial?: Partial<HomePagePayload> | null): HomePagePayload {
  return {
    countries: safeRecordRows(partial?.countries),
    tours: safeRecordRows(partial?.tours),
    updates: safeRecordRows(partial?.updates),
    categories: safeRecordRows(partial?.categories),
  };
}

export function resolveHomePageContent(content: HomePageContent | null | undefined): HomePageContent {
  if (!content || typeof content !== 'object') return DEFAULT_HOME_PAGE_CONTENT;
  return {
    ...DEFAULT_HOME_PAGE_CONTENT,
    ...content,
    faqs: Array.isArray(content.faqs) ? content.faqs : DEFAULT_HOME_PAGE_CONTENT.faqs,
  };
}

export function safeHeroSlides(slides: unknown): HomeHeroSlide[] {
  if (!Array.isArray(slides)) return [];
  return slides.filter((slide) => {
    if (!slide || typeof slide !== 'object') return false;
    const item = slide as HomeHeroSlide;
    return Boolean(item.href && resolvePublicHeroCarouselImage(item.image));
  }) as HomeHeroSlide[];
}
