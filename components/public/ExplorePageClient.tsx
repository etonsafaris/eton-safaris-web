'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import { explorePlacePath } from '@/lib/cms-routes';
import { matchesCountry } from '@/lib/country-utils';
import {
  fetchCollectionPage,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  recordCardBlurb,
} from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

function ExploreContent({
  initialPlaces,
  initialTotal = 0,
}: {
  initialPlaces: RecordRow[];
  initialTotal?: number;
}) {
  const searchParams = useSearchParams();
  const countryFilter = searchParams?.get('country') || '';
  const live = useCmsLive();
  const [places, setPlaces] = useState<RecordRow[]>(initialPlaces);
  const [total, setTotal] = useState(initialTotal || initialPlaces.length);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setPlaces(initialPlaces);
    setTotal(initialTotal || initialPlaces.length);
  }, [initialPlaces, initialTotal]);

  useEffect(() => {
    if (live === 0) return;
    fetchCollectionPage('explore', [], {
      limit: 48,
      offset: 0,
      filters: countryFilter ? { country: countryFilter } : undefined,
    })
      .then((page) => {
        setPlaces(page.rows.filter(isPublishedRecord));
        setTotal(page.total);
      })
      .catch((error) => console.error('[Supabase] Failed to load explore places:', error));
  }, [live, countryFilter]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchCollectionPage('explore', [], {
        limit: 48,
        offset: places.length,
        filters: countryFilter ? { country: countryFilter } : undefined,
      });
      setPlaces((current) => {
        const seen = new Set(current.map((row) => String(row.id || '')));
        return [
          ...current,
          ...page.rows.filter(isPublishedRecord).filter((row) => !seen.has(String(row.id || ''))),
        ];
      });
      setTotal(page.total);
    } catch (error) {
      console.error('[Supabase] Failed to load more explore places:', error);
    } finally {
      setLoadingMore(false);
    }
  }

  const filteredPlaces = useMemo(() => {
    if (!countryFilter) return places;
    return places.filter((place) => matchesCountry(place, countryFilter));
  }, [countryFilter, places]);

  return (
    <>
      <PageHero
        title={countryFilter ? `Explore ${countryFilter.replace(/-/g, ' ')}` : 'Explore Africa'}
        subtitle="Places and experiences across the continent"
        image={filteredPlaces[0] ? getRecordImage(filteredPlaces[0]) : undefined}
      />
      <ListingSection>
        {filteredPlaces.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {filteredPlaces.map((place, index) => (
                <PlaceCard
                  key={String(place.id ?? index)}
                  href={explorePlacePath(place)}
                  image={getRecordImage(place) || undefined}
                  title={getRecordTitle(place)}
                  location={pickString(place, ['location', 'country']) || undefined}
                  description={recordCardBlurb(place)}
                  cta="Read More"
                />
              ))}
            </ListingGrid>
            {!countryFilter && places.length < total ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a] disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more places (${places.length} of ${total.toLocaleString()})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </ListingSection>
    </>
  );
}

export default function ExplorePageClient({
  initialPlaces,
  initialTotal = 0,
}: {
  initialPlaces: RecordRow[];
  initialTotal?: number;
}) {
  return (
    <PublicShell>
      <Suspense fallback={<div className="py-24 text-center text-gray-500">Loading places…</div>}>
        <ExploreContent initialPlaces={initialPlaces} initialTotal={initialTotal} />
      </Suspense>
    </PublicShell>
  );
}
