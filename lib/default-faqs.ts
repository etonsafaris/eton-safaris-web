import { bestFaqsFor } from '@/lib/best-faqs';
import { DEFAULT_CMS_PAGES, DEFAULT_LANDING_PAGES } from '@/lib/cms-defaults';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { parseCmsPageExtras, type PageFaq } from '@/lib/cms-page-model';
import { getRecordTitle, pickString } from '@/lib/data';
import { landingConversionCopy } from '@/lib/landing-page-copy';
import { canonicalCountrySlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

function countryKey(slug: string) {
  return String(slug || '')
    .replace(/^\/+/, '')
    .replace(/-safaris$/i, '')
    .toLowerCase();
}

function pageArea(slug: string): 'home' | 'contact' | null {
  const key = slug.replace(/^\/+/, '').toLowerCase();
  if (!key || key === 'home' || key.includes('home-page') || key === 'homepage') return 'home';
  if (key.includes('contact') || key.includes('request-a-quote') || key.includes('quote')) return 'contact';
  return null;
}

/**
 * Public FAQ defaults that match what the live site shows (bestFaqsFor / seeded CMS).
 * Admin editors merge stored CMS FAQs on top of these so editors see the same list.
 */
export function defaultPublicFaqs(input: {
  collection?: string;
  slug?: string;
  title?: string;
  country?: string;
  category?: string;
}): PageFaq[] {
  const slug = String(input.slug || '')
    .replace(/^\/+/, '')
    .toLowerCase();
  const title = String(input.title || input.country || slug).trim();
  const collection = String(input.collection || '');
  const countryName = String(input.country || title).trim() || 'this destination';
  const countrySlug =
    canonicalCountrySlug(countryName) ||
    countrySlugFromLanding(slug) ||
    countryKey(slug) ||
    countryKey(countryName);

  if (collection === 'countries') {
    return bestFaqsFor('country', { countrySlug, countryName: title || countryName });
  }

  if (collection === 'categories') {
    return bestFaqsFor('category', {
      countrySlug,
      countryName,
      categoryTitle: title,
      title,
    });
  }

  if (collection === 'tours') {
    return bestFaqsFor('tour', {
      countrySlug,
      countryName,
      categoryTitle: String(input.category || title).trim() || title,
      title,
    });
  }

  if (collection === 'national_park' || collection === 'national_parks' || collection === 'parks' || collection === 'explore') {
    return bestFaqsFor('park', { countrySlug, countryName, title });
  }

  if (collection === 'accommodations') {
    return bestFaqsFor('stay', { countrySlug, countryName, title });
  }

  if (collection === 'landing_pages') {
    const landing =
      DEFAULT_LANDING_PAGES.find((item) => item.slug === slug) ||
      DEFAULT_LANDING_PAGES.find((item) => item.slug === `${countryKey(slug)}-safaris`);
    const fromBest = bestFaqsFor('country', {
      countrySlug: countrySlugFromLanding(slug) || countryKey(input.country || slug),
      countryName: input.country || title,
    });
    if (landing?.faqs.length) return mergeFaqs(landing.faqs, fromBest);
    return fromBest;
  }

  if (collection === 'pages' || collection === 'community') {
    const area = pageArea(slug);
    if (area) return bestFaqsFor(area);
    const page = DEFAULT_CMS_PAGES.find((item) => item.slug === slug);
    if (page?.faqs.length) return page.faqs;
    return bestFaqsFor('home');
  }

  const page = DEFAULT_CMS_PAGES.find((item) => item.slug === slug);
  if (page?.faqs.length) return page.faqs;
  return landingConversionCopy(countrySlug || countryKey(input.country || slug), countryName).faqs;
}

export function mergeFaqs(stored: PageFaq[], defaults: PageFaq[]) {
  if (!defaults.length) return stored;
  const seen = new Set(stored.map((faq) => faq.question.trim().toLowerCase()));
  const missing = defaults.filter((faq) => !seen.has(faq.question.trim().toLowerCase()));
  return [...stored, ...missing];
}

export function faqsForEditor(record: RecordRow | null | undefined, collection: string): PageFaq[] {
  const extras = parseCmsPageExtras(record, pickString(record || {}, ['slug']));
  return mergeFaqs(
    extras.faqs,
    defaultPublicFaqs({
      collection,
      slug: pickString(record || {}, ['slug', 'seo_slug']),
      title: record ? getRecordTitle(record) : '',
      country: pickString(record || {}, ['country', 'name']),
      category: pickString(record || {}, ['category', 'category_name']),
    })
  );
}
