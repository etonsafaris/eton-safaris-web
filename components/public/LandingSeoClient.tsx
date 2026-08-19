'use client';

import { useEffect, useState } from 'react';
import LandingPageContent from '@/components/public/LandingPageContent';
import PublicShell from '@/components/public/PublicShell';
import { countrySlugFromLanding, landingCmsSlug, matchCmsRecord } from '@/lib/cms-routes';
import { landingConversionCopy, landingVisibleH1 } from '@/lib/landing-page-copy';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { LANDING_PAGE_DEFAULTS } from '@/lib/static-pages';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  pickString,
} from '@/lib/data';
import { countryLabelFromSlug, normalizeSlug } from '@/lib/country-utils';
import type { RecordRow } from '@/lib/types';

export default function LandingSeoClient({ slug }: { slug: string }) {
  const canonical = landingCmsSlug(slug);
  const countrySlug = countrySlugFromLanding(canonical);
  const [landing, setLanding] = useState<RecordRow | null>(null);
  const [country, setCountry] = useState<RecordRow | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [landingRows, countryRows] = await Promise.all([
          fetchCollectionRecords('landing_pages'),
          fetchCollectionRecords('countries'),
        ]);
        const landingMatch =
          matchCmsRecord(landingRows, canonical, [countrySlug, canonical.replace(/-safaris$/, '')]) || null;
        const countryMatch =
          countryRows.find((row) => normalizeSlug(pickString(row, ['slug', 'name', 'title'])) === countrySlug) || null;
        if (mounted) {
          setLanding(landingMatch);
          setCountry(countryMatch);
        }
      } catch (error) {
        console.error('[Landing SEO] Failed to load landing:', error);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [canonical, countrySlug]);

  const seeded = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS].find((item) => item.slug === countrySlug);
  const fallback = LANDING_PAGE_DEFAULTS[canonical];
  const countryName =
    (country && getRecordTitle(country)) ||
    pickString(landing || {}, ['country']) ||
    fallback?.country ||
    seeded?.name ||
    countryLabelFromSlug(countrySlug);
  const extras = parseCmsPageExtras(landing, canonical);
  const copy = landingConversionCopy(countrySlug, countryName);
  const heroTitle = landingVisibleH1(
    countrySlug,
    countryName,
    extras.hero_title || pickString(landing || {}, ['headline']) || copy.h1
  );
  const merged: RecordRow = {
    ...(country || {}),
    title: countryName,
    name: countryName,
    slug: countrySlug,
    image_url:
      (landing && getRecordImage(landing)) ||
      (country && getRecordImage(country)) ||
      fallback?.image ||
      '',
  };

  return (
    <PublicShell>
      <LandingPageContent slug={countrySlug} country={merged} landing={landing} heroTitle={heroTitle} />
    </PublicShell>
  );
}
