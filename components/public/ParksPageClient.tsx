'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PageFaqList from '@/components/public/PageFaqList';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
} from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import { bestFaqsFor } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

export default function ParksPageClient({ initialParks }: { initialParks: RecordRow[] }) {
  const live = useCmsLive();
  const [parks, setParks] = useState<RecordRow[]>(initialParks);

  useEffect(() => {
    setParks(initialParks);
  }, [initialParks]);

  useEffect(() => {
    if (live === 0) return;
    fetchCollectionRecords('national_park', ['national_parks', 'parks'])
      .then((rows) => setParks(rows.filter(isPublishedRecord)))
      .catch((error) => console.error('[Supabase] Failed to load parks:', error));
  }, [live]);

  return (
    <PublicShell>
      <PageHero
        title="National Parks"
        subtitle={`${parks.length.toLocaleString()} national parks and reserves across Africa`}
        image={parks[0] ? getRecordImage(parks[0]) : undefined}
      />
      <ListingSection>
        {parks.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <ListingGrid>
            {parks.map((park, index) => (
              <PlaceCard
                key={String(park.id ?? index)}
                href={`/parks/${publicRecordSlug(park)}`}
                image={getRecordImage(park) || undefined}
                title={getRecordTitle(park)}
                location={pickString(park, ['location', 'country'])}
                description={recordCardBlurb(park)}
                cta="View Park"
              />
            ))}
          </ListingGrid>
        )}
      </ListingSection>
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('parks')} tone="light" />
      </div>
    </PublicShell>
  );
}
