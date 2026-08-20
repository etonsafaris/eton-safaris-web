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
import { countryHeroImage } from '@/lib/country-heroes';
import { countryLabelFromSlug, findCategoryBySlug, findPlaceBySlug, normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

function paramValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function CmsSlugClient() {
  const params = useParams<{ slug?: string | string[]; category?: string | string[] }>();
  const rawSlug = paramValue(params?.slug);
  const categorySlug = paramValue(params?.category);
  const resolved = resolvePublicSlug(rawSlug);
  const live = useCmsLive();
  const [page, setPage] = useState<RecordRow | null>(null);
  const [country, setCountry] = useState<RecordRow | null>(null);
  const [nestedPlace, setNestedPlace] = useState<RecordRow | null>(null);
  const [nestedIsCategory, setNestedIsCategory] = useState(false);
  const [forceCountry, setForceCountry] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

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
      image_url: countryHeroImage(countrySlug, country) || fallback?.image || '',
    };

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
          <CountryPageContent slug={countrySlug} country={merged} />
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
    (isPolicy ? fallback?.title : page ? getRecordTitle(page) : fallback?.title) ||
    seeded?.title ||
    resolved.canonical.replace(/-/g, ' ');
  const content =
    (isPolicy && !cmsLooksRich ? fallback?.content : cmsContent) || fallback?.content || seeded?.content || '';
  const image = (page ? getRecordImage(page) : '') || seeded?.image_url || undefined;
  const blocks = parseCmsBlocks(page).length ? parseCmsBlocks(page) : seeded?.blocks || [];
  const faqs = extras.faqs.length ? extras.faqs : seeded?.faqs || [];
  const destinations = extras.destinations.length ? extras.destinations : seeded?.destinations || [];

  if (!ready && !fallback && !seeded) return null;

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
