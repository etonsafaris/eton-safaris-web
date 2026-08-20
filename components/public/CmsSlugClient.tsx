'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCmsLive } from '@/lib/cms-live';
import PublicShell from '@/components/public/PublicShell';
import CountryPageContent from '@/components/public/CountryPageContent';
import CategoryPageContent from '@/components/public/CategoryPageContent';
import PlacePageContent from '@/components/public/PlacePageContent';
import CmsPageView from '@/components/public/CmsPageView';
import {
  countrySlugFromLanding,
  matchCmsRecord,
  pageAliases,
  resolvePublicSlug,
} from '@/lib/cms-routes';
import { LANDING_PAGE_DEFAULTS, STATIC_PAGES } from '@/lib/static-pages';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { parseCmsBlocks, parseCmsPageExtras, inferPageLayout } from '@/lib/cms-page-model';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
} from '@/lib/data';
import { countryLabelFromSlug, findCategoryBySlug, findPlaceBySlug, normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

function paramValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function CmsSlugClient({
  initialCountry = null,
  initialPage = null,
  initialCategories = [],
  initialTours = [],
  initialParks = [],
  initialPlaces = [],
}: {
  initialCountry?: RecordRow | null;
  initialPage?: RecordRow | null;
  initialCategories?: RecordRow[];
  initialTours?: RecordRow[];
  initialParks?: RecordRow[];
  initialPlaces?: RecordRow[];
}) {
  const params = useParams<{ slug?: string | string[]; category?: string | string[] }>();
  const rawSlug = paramValue(params?.slug);
  const categorySlug = paramValue(params?.category);
  const resolved = resolvePublicSlug(rawSlug);
  const live = useCmsLive();
  const [page, setPage] = useState<RecordRow | null>(initialPage);
  const [country, setCountry] = useState<RecordRow | null>(initialCountry);
  const [nestedPlace, setNestedPlace] = useState<RecordRow | null>(null);
  const [nestedIsCategory, setNestedIsCategory] = useState(false);
  const [forceCountry, setForceCountry] = useState(Boolean(initialCountry && resolved?.kind === 'country'));
  const [ready, setReady] = useState(Boolean(initialCountry || initialPage));

  useEffect(() => {
    let mounted = true;
    if (live === 0 && !categorySlug && (initialCountry || initialPage)) {
      setCountry(initialCountry);
      setPage(initialPage);
      setReady(true);
      return undefined;
    }

    async function loadCountry(canonical: string, countrySlug: string) {
      const [countryRows, categoryRows, placeRows] = await Promise.all([
        fetchCollectionRecords('countries'),
        categorySlug ? fetchCollectionRecords('categories') : Promise.resolve([]),
        categorySlug ? fetchCollectionRecords('explore') : Promise.resolve([]),
      ]);
      const countryMatch =
        countryRows.find((row) => normalizeSlug(pickString(row, ['slug', 'name', 'title'])) === countrySlug) ||
        countryRows.find(
          (row) => normalizeSlug(pickString(row, ['slug', 'name', 'title'])) === countrySlugFromLanding(canonical)
        ) ||
        null;
      const categoryMatch = categorySlug
        ? findCategoryBySlug(categoryRows.filter(isPublishedRecord), categorySlug)
        : null;
      const placeMatch =
        categorySlug && !categoryMatch
          ? findPlaceBySlug(placeRows.filter(isPublishedRecord), categorySlug, countrySlug) ||
            findPlaceBySlug(placeRows, categorySlug, countrySlug)
          : null;
      if (mounted) {
        setCountry(countryMatch);
        setNestedIsCategory(Boolean(categoryMatch));
        setNestedPlace(placeMatch);
      }
      return Boolean(countryMatch || LANDING_PAGE_DEFAULTS[canonical] || canonical.endsWith('-safaris'));
    }

    async function load() {
      if (!resolved) {
        setReady(true);
        return;
      }
      if (categorySlug) setReady(false);
      try {
        if (resolved.kind === 'country') {
          await loadCountry(resolved.canonical, resolved.countrySlug || countrySlugFromLanding(resolved.canonical));
        } else {
          const rows = await fetchCollectionRecords('pages');
          const match = matchCmsRecord(rows, resolved.canonical, pageAliases(resolved.canonical));
          const published = match && isPublishedRecord(match) ? match : null;
          if (published) {
            if (mounted) setPage(published);
          } else {
            const found = await loadCountry(resolved.canonical, countrySlugFromLanding(resolved.canonical));
            if (mounted) setForceCountry(found);
          }
        }
      } catch (error) {
        console.error('[CMS] Failed to load page:', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [rawSlug, categorySlug, resolved?.canonical, resolved?.kind, resolved?.countrySlug, live]);

  const showCountry = resolved?.kind === 'country' || forceCountry;

  if (!resolved) {
    if (!ready) return null;
    return (
      <PublicShell>
        <div className="py-24 text-center text-gray-500">This page is not available.</div>
      </PublicShell>
    );
  }

  if (showCountry) {
    const countrySlug = resolved.countrySlug || countrySlugFromLanding(resolved.canonical);
    const fallback = LANDING_PAGE_DEFAULTS[resolved.canonical] || LANDING_PAGE_DEFAULTS[`${countrySlug}-safaris`];
    const countryName =
      (country && getRecordTitle(country)) ||
      fallback?.country ||
      countryLabelFromSlug(countrySlug);
    const merged: RecordRow = {
      ...(country || {}),
      title: countryName,
      name: countryName,
    };

    if (!ready && !country) {
      return (
        <PublicShell>
          <div className="py-24 text-center text-gray-500">Loading…</div>
        </PublicShell>
      );
    }

    return (
      <PublicShell>
        {categorySlug ? (
          !ready ? (
            <div className="py-24 text-center text-gray-500">Loading…</div>
          ) : nestedPlace && !nestedIsCategory ? (
            <PlacePageContent
              slug={countrySlug}
              country={merged}
              placeSlug={categorySlug}
              place={nestedPlace}
            />
          ) : (
            <CategoryPageContent slug={countrySlug} country={merged} categorySlug={categorySlug} />
          )
        ) : (
          <CountryPageContent
            slug={countrySlug}
            country={merged}
            initialCategories={initialCategories}
            initialTours={initialTours}
            initialParks={initialParks}
            initialPlaces={initialPlaces}
          />
        )}
      </PublicShell>
    );
  }

  const fallback = STATIC_PAGES[resolved.canonical];
  const seeded = DEFAULT_CMS_PAGES.find((item) => item.slug === resolved.canonical);
  if (!page && !fallback && !seeded && ready) {
    return (
      <PublicShell>
        <div className="py-24 text-center text-gray-500">This page is not available.</div>
      </PublicShell>
    );
  }

  const extras = parseCmsPageExtras(page, resolved.canonical);
  const layout = extras.layout && extras.layout !== 'standard' ? extras.layout : inferPageLayout(resolved.canonical);
  const isPolicy = layout === 'policy';
  const cmsContent = page ? pickString(page, ['content', 'description', 'body']) : '';
  const cmsLooksRich = /<(h4|p|ul|ol|b|strong)\b/i.test(cmsContent);
  const title =
    extras.hero_title ||
    (page ? getRecordTitle(page) : '') ||
    (isPolicy ? fallback?.title : '') ||
    resolved.canonical.replace(/-/g, ' ');
  const content = cmsContent || (!page && isPolicy ? fallback?.content || '' : '');
  const image = page ? getRecordImage(page) || undefined : undefined;
  const blocks = parseCmsBlocks(page);
  const faqs = extras.faqs;
  const destinations = extras.destinations;

  if (!ready && !page) {
    return (
      <PublicShell>
        <div className="py-24 text-center text-gray-500">Loading…</div>
      </PublicShell>
    );
  }

  return (
    <CmsPageView
      title={title}
      image={image}
      content={content}
      variant={layout}
      subtitle={extras.subtitle || seeded?.subtitle}
      videoUrl={extras.video_url || seeded?.video_url}
      destinations={destinations}
      faqs={faqs}
      blocks={blocks}
      ctaLabel={extras.cta_label || 'Talk to Us'}
      ctaHref={extras.cta_href || '/contact-us'}
    />
  );
}
