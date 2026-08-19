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
import type { RecordRow } from '@/lib/types';

export default function AccommodationsPage() {
  const [rows, setRows] = useState<RecordRow[]>([]);

  useEffect(() => {
    fetchCollectionRecords('accommodations')
      .then((rows) => setRows(rows.filter(isPublishedRecord)))
      .catch((error) => console.error(error));
  }, []);

  return (
    <PublicShell>
      <PageHero
        title="Accommodations"
        subtitle="Lodges, camps, hotels, and bandas"
        image={rows[0] ? getRecordImage(rows[0]) : undefined}
      />
      <ListingSection>
        {rows.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <ListingGrid>
            {rows.map((item, index) => (
              <PlaceCard
                key={String(item.id ?? index)}
                href={`/accommodations/${pickString(item, ['slug']) || item.id}`}
                image={getRecordImage(item) || undefined}
                title={getRecordTitle(item)}
                location={pickString(item, ['location', 'country', 'type'])}
                description={pickPlainText(item, ['description'])}
                cta="View Stay"
              />
            ))}
          </ListingGrid>
        )}
      </ListingSection>
    </PublicShell>
  );
}
