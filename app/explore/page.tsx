import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShell from '@/components/public/PublicShell';
import { explorePlacePath } from '@/lib/cms-routes';
import { matchesCountry } from '@/lib/country-utils';
import { loadExplorePageData } from '@/lib/load-public';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  pickString,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { Metadata } from 'next';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'Explore Places',
  description: 'Discover amazing places and experiences across Africa with Eton Safaris. From cultural sites to natural wonders, explore the continent with expert guides.',
  alternates: {
    canonical: 'https://etonsafaris.com/explore',
  },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { country?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const countryFilter = String(searchParams?.country || '').trim();
  const { places, total } = await loadExplorePageData({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const filtered = countryFilter
    ? places.filter((place) => matchesCountry(place, countryFilter))
    : places;

  return (
    <PublicShell>
      <PageHero
        title={countryFilter ? `Explore ${countryFilter.replace(/-/g, ' ')}` : 'Explore Africa'}
        subtitle="Places and experiences across the continent"
        image={filtered[0] ? getRecordImage(filtered[0]) : undefined}
        published={filtered[0] ? recordPublishedAt(filtered[0]) || undefined : undefined}
      />
      <ListingSection>
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {filtered.map((place, index) => (
                <PublicListingCard
                  key={String(place.id ?? index)}
                  href={explorePlacePath(place)}
                  image={getRecordImage(place) || undefined}
                  title={getRecordTitle(place)}
                  date={formatPublishedDate(place)}
                  location={pickString(place, ['location', 'country']) || undefined}
                  description={recordCardBlurb(place)}
                  cta="Read More"
                />
              ))}
            </ListingGrid>
            {countryFilter ? null : (
              <ListingPager
                basePath="/explore"
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                label="places"
              />
            )}
          </>
        )}
      </ListingSection>
    </PublicShell>
  );
}
