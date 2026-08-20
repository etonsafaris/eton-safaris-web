'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickString,
} from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
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
        subtitle="Wildlife reserves and parks across Africa"
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
                href={`/parks/${pickString(park, ['slug']) || park.id}`}
                image={getRecordImage(park) || undefined}
                title={getRecordTitle(park)}
                location={pickString(park, ['location', 'country'])}
                description={pickPlainText(park, ['description'])}
                cta="View Park"
              />
            ))}
          </ListingGrid>
        )}
      </ListingSection>
    </PublicShell>
  );
}
