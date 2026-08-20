'use client';

import { useEffect, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickString,
} from '@/lib/data';
import { destinationPublicPath } from '@/lib/cms-routes';
import { countryHeroImage } from '@/lib/country-heroes';
import type { RecordRow } from '@/lib/types';

export default function DestinationsIndexClient({ initialCountries }: { initialCountries: RecordRow[] }) {
  const live = useCmsLive();
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);

  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  useEffect(() => {
    fetchCollectionRecords('countries')
      .then((rows) => setCountries(rows.filter(isPublishedRecord)))
      .catch((error) => console.error('[Supabase] Failed to load destinations:', error));
  }, [live]);

  const items = countries;

  return (
    <PublicShell>
      <PageHero
        title="Destinations"
        subtitle="Safari countries across Africa, from gorilla forests to savannah and coast."
        image={countryHeroImage(pickString(items[0] || {}, ['slug', 'name']), items[0])}
      />
      <ListingSection>
        {items.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <ListingGrid>
            {items.map((country, index) => {
              const slug = pickString(country, ['slug', 'name']) || String(country.id || index);
              return (
                <PlaceCard
                  key={String(country.id ?? slug ?? index)}
                  href={destinationPublicPath(String(slug))}
                  image={countryHeroImage(String(slug), country)}
                  title={getRecordTitle(country)}
                  location={pickString(country, ['tagline', 'subtitle', 'headline'])}
                  description={pickPlainText(country, ['summary', 'description', 'excerpt'])}
                  cta="Explore"
                />
              );
            })}
          </ListingGrid>
        )}
      </ListingSection>
    </PublicShell>
  );
}
