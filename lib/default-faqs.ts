import { DEFAULT_CMS_PAGES, DEFAULT_LANDING_PAGES } from '@/lib/cms-defaults';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { parseCmsPageExtras, type PageFaq } from '@/lib/cms-page-model';
import { getRecordTitle, pickString } from '@/lib/data';
import { landingConversionCopy } from '@/lib/landing-page-copy';
import type { RecordRow } from '@/lib/types';

function countryKey(slug: string) {
  return String(slug || '')
    .replace(/^\/+/, '')
    .replace(/-safaris$/i, '')
    .toLowerCase();
}

export function defaultPublicFaqs(input: {
  collection?: string;
  slug?: string;
  title?: string;
  country?: string;
}): PageFaq[] {
  const slug = String(input.slug || '')
    .replace(/^\/+/, '')
    .toLowerCase();
  const title = String(input.title || input.country || slug).trim();
  const collection = String(input.collection || '');

  if (collection === 'pages' || collection === 'community') {
    const page = DEFAULT_CMS_PAGES.find((item) => item.slug === slug);
    if (page?.faqs.length) return page.faqs;
  }

  if (collection === 'landing_pages') {
    const landing =
      DEFAULT_LANDING_PAGES.find((item) => item.slug === slug) ||
      DEFAULT_LANDING_PAGES.find((item) => item.slug === `${countryKey(slug)}-safaris`);
    if (landing?.faqs.length) return landing.faqs;
    return landingConversionCopy(countrySlugFromLanding(slug) || countryKey(input.country || slug), input.country || title)
      .faqs;
  }

  if (collection === 'countries') {
    return landingConversionCopy(countryKey(slug), title).faqs;
  }

  const page = DEFAULT_CMS_PAGES.find((item) => item.slug === slug);
  if (page?.faqs.length) return page.faqs;

  if (slug) {
    return landingConversionCopy(countryKey(slug), title).faqs;
  }

  return [];
}

export function faqsForEditor(record: RecordRow | null | undefined, collection: string): PageFaq[] {
  const extras = parseCmsPageExtras(record, pickString(record || {}, ['slug']));
  if (extras.faqs.length) return extras.faqs;
  return defaultPublicFaqs({
    collection,
    slug: pickString(record || {}, ['slug']),
    title: record ? getRecordTitle(record) : '',
    country: pickString(record || {}, ['country', 'name']),
  });
}
