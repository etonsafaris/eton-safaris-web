'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShell from '@/components/public/PublicShell';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { countrySlugFromLanding } from '@/lib/cms-routes';
import { countryLabelFromSlug, normalizeSlug } from '@/lib/country-utils';
import { fetchCollectionRecords, isPublishedRecord, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

const SEEDED = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS];

export default function DestinationCountryPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  const [country, setCountry] = useState<RecordRow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const rows = await fetchCollectionRecords('countries');
        const match =
          rows.find((row) => normalizeSlug(pickString(row, ['slug', 'name', 'title'])) === slug) || null;
        if (mounted) setCountry(match && isPublishedRecord(match) ? match : null);
      } catch (error) {
        console.error('[Destinations] Failed to load country:', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const seeded = SEEDED.find((item) => item.slug === slug);
  if (ready && !country && !seeded) notFound();

  const merged: RecordRow = country || {
    name: seeded?.name || countryLabelFromSlug(slug),
    title: seeded?.name || countryLabelFromSlug(slug),
    slug,
  };

  return (
    <PublicShell>
      <CountryPageContent slug={slug} country={merged} />
    </PublicShell>
  );
}
