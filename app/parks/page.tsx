import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadParksPageData } from '@/lib/load-public';
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

export const revalidate = 900;

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'National Parks',
  description:
    'Explore national parks and wildlife reserves across East Africa — gorilla habitats, savannah, and conservation areas with Eton Safaris.',
  alternates: { canonical: publicCanonicalUrl('/parks') },
  robots: { index: true, follow: true },
};

export default async function NationalParksPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { parks, total } = await loadParksPageData({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <PublicShellServer>
      <PageHero
        variant="park"
        title="National Parks"
        subtitle={total ? `${total.toLocaleString()} parks and reserves` : 'Wildlife destinations'}
        image={SITE_MEDIA.wildlifeNationalPark}
      />
      <ListingSection>
        {parks.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {parks.map((park, index) => (
                <PublicListingCard
                  key={String(park.id ?? index)}
                  href={`/parks/${publicRecordSlug(park)}`}
                  image={getRecordImage(park) || undefined}
                  title={getRecordTitle(park)}
                  location={pickString(park, ['country', 'location'])}
                  description={recordCardBlurb(park)}
                  cta="View Park"
                />
              ))}
            </ListingGrid>
            <ListingPager basePath="/parks" page={page} pageSize={PAGE_SIZE} total={total} label="parks" />
          </>
        )}
      </ListingSection>
    </PublicShellServer>
  );
}
