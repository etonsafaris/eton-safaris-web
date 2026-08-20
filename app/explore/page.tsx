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
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
} from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

function ExploreContent() {
  const searchParams = useSearchParams();
  const countryFilter = searchParams?.get('country') || '';
  const live = useCmsLive();
  const [places, setPlaces] = useState<RecordRow[]>([]);

  useEffect(() => {
    fetchCollectionRecords('explore')
      .then((rows) => setPlaces(rows.filter(isPublishedRecord)))
      .catch((error) => console.error('[Supabase] Failed to load explore places:', error));
  }, [live]);

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
          <ListingGrid>
            {filteredPlaces.map((place, index) => (
              <PlaceCard
                key={String(place.id ?? index)}
                href={explorePlacePath(place)}
                image={getRecordImage(place) || undefined}
                title={getRecordTitle(place)}
                location={pickPlainText(place, ['location', 'country']) || undefined}
                description={pickPlainText(place, ['description', 'excerpt', 'content'])}
                cta="Read More"
              />
            ))}
          </ListingGrid>
        )}
      </ListingSection>
    </>
  );
}

export default function ExplorePage() {
  return (
    <PublicShell>
      <Suspense fallback={<div className="py-24 text-center text-gray-500">Loading places…</div>}>
        <ExploreContent />
      </Suspense>
    </PublicShell>
  );
}
