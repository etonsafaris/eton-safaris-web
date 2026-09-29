'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import {
  fetchCollectionRecords,
  isPublishedRecord,
  pickString,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { destinationPublicPath } from '@/lib/cms-routes';
import { publicCountrySlug, publicCountryLabel } from '@/lib/country-utils';
import { countryHeroImage } from '@/lib/country-heroes';
import { destinationListingRows } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';

export default function DestinationsIndexClient({ initialCountries }: { initialCountries: RecordRow[] }) {
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);

  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  useCmsPageReload(() => {
    fetchCollectionRecords('countries', [], { maxRows: 48 })
      .then((rows) => setCountries(rows.filter(isPublishedRecord)))
      .catch((error) => console.error('[Supabase] Failed to load destinations:', error));
  }, initialCountries.length > 0);

  const items = useMemo(() => destinationListingRows(countries), [countries]);

  return (
    <>
      <PageHero
        title="Destinations"
        subtitle="Safari countries across Africa, from gorilla forests to savannah and coast."
        image={countryHeroImage(publicCountrySlug(items[0] || {}) || pickString(items[0] || {}, ['name']), items[0])}
        published={items[0] ? recordPublishedAt(items[0]) || undefined : undefined}
      />
      <ListingSection>
        {items.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <ListingGrid>
            {items.map((country, index) => {
              const slug = publicCountrySlug(country) || '';
              const title = publicCountryLabel(country, slug);
              return (
                <PlaceCard
                  key={String(country.id ?? slug ?? index)}
                  href={destinationPublicPath(slug)}
                  image={countryHeroImage(slug, country) || undefined}
                  title={title}
                  location={pickString(country, ['tagline', 'subtitle', 'headline'])}
                  description={recordCardBlurb(country)}
                  cta="Explore"
                />
              );
            })}
          </ListingGrid>
        )}
      </ListingSection>
    </>
  );
}
