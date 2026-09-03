'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PageFaqList from '@/components/public/PageFaqList';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionPage,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
} from '@/lib/data';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import { bestFaqsFor } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

export default function ParksPageClient({
  initialParks,
  initialTotal = 0,
}: {
  initialParks: RecordRow[];
  initialTotal?: number;
}) {
  const [parks, setParks] = useState<RecordRow[]>(initialParks);
  const [total, setTotal] = useState(initialTotal || initialParks.length);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setParks(initialParks);
    setTotal(initialTotal || initialParks.length);
  }, [initialParks, initialTotal]);

  useCmsPageReload(() => {
    fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 48, offset: 0 })
      .then((page) => {
        setParks(page.rows.filter(isPublishedRecord));
        setTotal(page.total);
      })
      .catch((error) => console.error('[Supabase] Failed to load parks:', error));
  }, initialParks.length > 0);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchCollectionPage('national_park', ['national_parks', 'parks'], {
        limit: 48,
        offset: parks.length,
      });
      setParks((current) => {
        const seen = new Set(current.map((row) => String(row.id || '')));
        return [
          ...current,
          ...page.rows.filter(isPublishedRecord).filter((row) => !seen.has(String(row.id || ''))),
        ];
      });
      setTotal(page.total);
    } catch (error) {
      console.error('[Supabase] Failed to load more parks:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <PublicShell>
      <PageHero
        title="National Parks"
        subtitle={`${total.toLocaleString()} national parks and reserves across Africa`}
        image={parks[0] ? getRecordImage(parks[0]) : undefined}
      />
      <ListingSection>
        {parks.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {parks.map((park, index) => (
                <PlaceCard
                  key={String(park.id ?? index)}
                  href={`/parks/${publicRecordSlug(park)}`}
                  image={getRecordImage(park) || undefined}
                  title={getRecordTitle(park)}
                  record={park}
                  location={pickString(park, ['location', 'country'])}
                  description={recordCardBlurb(park)}
                  cta="View Park"
                />
              ))}
            </ListingGrid>
            {parks.length < total ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a] disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more parks (${parks.length} of ${total.toLocaleString()})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </ListingSection>
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('parks')} tone="light" />
      </div>
    </PublicShell>
  );
}
