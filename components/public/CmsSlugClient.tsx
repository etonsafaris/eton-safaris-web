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
import { inferPageLayout } from '@/lib/cms-page-model';
import { hydratePublicCmsPage } from '@/lib/hydrate-cms-page';
import {
  fetchCollectionRecords,
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
  initialNestedPlace = null,
  initialNestedIsCategory = false,
}: {
  initialCountry?: RecordRow | null;
  initialPage?: RecordRow | null;
  initialCategories?: RecordRow[];
  initialTours?: RecordRow[];
  initialParks?: RecordRow[];
  initialPlaces?: RecordRow[];
  initialNestedPlace?: RecordRow | null;
  initialNestedIsCategory?: boolean;
}) {
  const params = useParams<{ slug?: string | string[]; category?: string | string[] }>();
  const rawSlug = paramValue(params?.slug);
  const categorySlug = paramValue(params?.category);
  const resolved = resolvePublicSlug(rawSlug);
  const live = useCmsLive();
  const [page, setPage] = useState<RecordRow | null>(initialPage);
  const [country, setCountry] = useState<RecordRow | null>(initialCountry);
  const [nestedPlace, setNestedPlace] = useState<RecordRow | null>(initialNestedPlace);
  const [nestedIsCategory, setNestedIsCategory] = useState(initialNestedIsCategory);
  const [forceCountry, setForceCountry] = useState(Boolean(initialCountry && resolved?.kind === 'country'));
  const [ready, setReady] = useState(Boolean(initialCountry || initialPage || initialNestedPlace || initialNestedIsCategory));

  useEffect(() => {
    let mounted = true;
    const hasNested = Boolean(initialNestedPlace || initialNestedIsCategory);
    const hasFirstPaint =
      Boolean(initialCountry || initialPage) && (!categorySlug || hasNested);

    if (hasFirstPaint) {
      setCountry(initialCountry);
      setPage(initialPage);
      setNestedPlace(initialNestedPlace);
      setNestedIsCategory(initialNestedIsCategory);
      setReady(true);
      if (live === 0) return undefined;
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
      if (categorySlug && !hasFirstPaint) setReady(false);
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
          nestedPlace && !nestedIsCategory ? (
            <PlacePageContent
              slug={countrySlug}
              country={merged}
              placeSlug={categorySlug}
              place={nestedPlace}
            />
          ) : (
            <CategoryPageContent
              slug={countrySlug}
              country={merged}
              categorySlug={categorySlug}
              initialCategories={initialCategories}
              initialTours={initialTours}
            />
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

  const view = hydratePublicCmsPage(page, resolved.canonical);
  const layout = view.layout && view.layout !== 'standard' ? view.layout : inferPageLayout(resolved.canonical);
  const isPolicy = layout === 'policy';
  const title =
    view.title ||
    (isPolicy ? fallback?.title : '') ||
    resolved.canonical.replace(/-/g, ' ');
  const content = view.content || (!page && isPolicy ? fallback?.content || '' : '');
  const image = view.image || undefined;
  const blocks = view.blocks;
  const faqs = view.faqs;
  const destinations = view.destinations;

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
      subtitle={view.subtitle || (!page ? seeded?.subtitle : '')}
      videoUrl={view.videoUrl || (!page ? seeded?.video_url : '')}
      destinations={destinations}
      faqs={faqs}
      blocks={blocks}
      ctaLabel={view.ctaLabel || 'Talk to Us'}
      ctaHref={view.ctaHref || '/contact-us'}
    />
  );
}
