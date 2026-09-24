import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShellServer from '@/components/public/PublicShellServer';
import { matchesCountry } from '@/lib/country-utils';
import { loadExplorePageData } from '@/lib/load-public';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import {
  getRecordImage,
  getRecordTitle,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
} from '@/lib/data';
import { SITE_MEDIA } from '@/lib/site-media';
import type { Metadata } from 'next';

export { revalidate } from '@/lib/public-page-config';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'Explore Africa',
  description: 'Discover places, experiences, and hidden gems across African safari destinations with Eton Safaris.',
  alternates: { canonical: publicCanonicalUrl('/explore') },
  robots: { index: true, follow: true },
};

export default async function ExploreListingPage({
  searchParams,
}: {
  searchParams?: { page?: string; country?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const countryFilter = searchParams?.country?.trim() || '';
  let places: Awaited<ReturnType<typeof loadExplorePageData>>['places'] = [];
  let total = 0;
  try {
    const loaded = await loadExplorePageData({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    places = loaded.places ?? [];
    total = loaded.total ?? 0;
  } catch (error) {
    console.warn('[Public] Explore listing failed:', error);
  }
  if (countryFilter) {
    places = places.filter((row) => matchesCountry(row, countryFilter));
    total = places.length;
  }

  return (
    <PublicShellServer>
      <PageHero
        variant="default"
        title={countryFilter ? `Explore ${countryFilter.replace(/-/g, ' ')}` : 'Explore'}
        subtitle={total ? `${total.toLocaleString()} places to discover` : 'Destinations and experiences'}
        image={SITE_MEDIA.gorillasForest}
      />
      <ListingSection>
        {places.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {places.map((place, index) => (
                <PublicListingCard
                  key={String(place.id ?? index)}
                  href={`/explore/${publicRecordSlug(place)}`}
                  image={getRecordImage(place) || undefined}
                  title={getRecordTitle(place)}
                  location={pickString(place, ['country', 'location'])}
                  description={recordCardBlurb(place)}
                  cta="Explore"
                />
              ))}
            </ListingGrid>
            <ListingPager basePath="/explore" page={page} pageSize={PAGE_SIZE} total={total} label="places" />
          </>
        )}
      </ListingSection>
    </PublicShellServer>
  );
}
