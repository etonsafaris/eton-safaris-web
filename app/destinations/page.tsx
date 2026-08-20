'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  getRecordTitle,
  pickPlainText,
  pickString,
} from '@/lib/data';
import { NAV_COUNTRIES, OTHER_DESTINATIONS } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import { countryHeroImage } from '@/lib/country-heroes';
import type { RecordRow } from '@/lib/types';

export default function DestinationsIndexPage() {
  const [countries, setCountries] = useState<RecordRow[]>([]);

  useEffect(() => {
    fetchCollectionRecords('countries')
      .then(setCountries)
      .catch((error) => console.error('[Supabase] Failed to load destinations:', error));
  }, []);

  const fallback = [...NAV_COUNTRIES, ...OTHER_DESTINATIONS];
  const items =
    countries.length > 0
      ? countries
      : fallback.map((item) => ({ name: item.name, slug: item.slug, title: item.name }) as RecordRow);

  return (
    <PublicShell>
      <PageHero
        title="Destinations"
        subtitle="Safari countries across Africa, from gorilla forests to savannah and coast."
        image={countryHeroImage(pickString(items[0] || {}, ['slug', 'name']), items[0])}
      />
      <ListingSection>
        <ListingGrid>
          {items.map((country, index) => {
            const slug = pickString(country, ['slug']) || fallback[index]?.slug || country.id;
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
      </ListingSection>
    </PublicShell>
  );
}
