'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  pickString,
  recordCardBlurb,
} from '@/lib/data';
import { destinationPublicPath } from '@/lib/cms-routes';
import { publicCountrySlug, publicCountryLabel } from '@/lib/country-utils';
import { countryHeroImage } from '@/lib/country-heroes';
import { destinationListingRows } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';

export default function DestinationsIndexClient({ initialCountries }: { initialCountries: RecordRow[] }) {
  const live = useCmsLive();
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);

  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  useEffect(() => {
    fetchCollectionRecords('countries')
      .then((rows) => setCountries(rows))
      .catch((error) => console.error('[Supabase] Failed to load destinations:', error));
  }, [live]);

  const items = useMemo(() => destinationListingRows(countries), [countries]);

  return (
    <PublicShell>
      <PageHero
        title="Destinations"
        subtitle="Safari countries across Africa, from gorilla forests to savannah and coast."
        image={countryHeroImage(publicCountrySlug(items[0] || {}) || pickString(items[0] || {}, ['name']), items[0])}
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
                  image={countryHeroImage(slug, country)}
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
    </PublicShell>
  );
}
