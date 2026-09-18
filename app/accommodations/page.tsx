import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShellServer from '@/components/public/PublicShellServer';
import { loadAccommodationsPageData } from '@/lib/load-public';
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
  title: 'Safari Accommodations',
  description:
    'Browse lodges, camps, and safari stays across Uganda, Kenya, Tanzania, Rwanda, and beyond with Eton Safaris.',
  alternates: { canonical: publicCanonicalUrl('/accommodations') },
  robots: { index: true, follow: true },
};

export default async function AccommodationsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  let rows: Awaited<ReturnType<typeof loadAccommodationsPageData>>['rows'] = [];
  let total = 0;
  try {
    const loaded = await loadAccommodationsPageData({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    rows = loaded.rows ?? [];
    total = loaded.total ?? 0;
  } catch (error) {
    console.warn('[Public] Accommodations listing failed:', error);
  }

  return (
    <PublicShellServer>
      <PageHero
        variant="default"
        title="Accommodations"
        subtitle={total ? `${total.toLocaleString()} lodges and safari stays` : 'Places to stay on safari'}
        image={SITE_MEDIA.safariVehicle}
      />
      <ListingSection>
        {rows.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {rows.map((stay, index) => (
                <PublicListingCard
                  key={String(stay.id ?? index)}
                  href={`/accommodations/${publicRecordSlug(stay)}`}
                  image={getRecordImage(stay) || undefined}
                  title={getRecordTitle(stay)}
                  location={pickString(stay, ['country', 'location', 'national_park_name'])}
                  description={recordCardBlurb(stay)}
                  cta="View Stay"
                />
              ))}
            </ListingGrid>
            <ListingPager
              basePath="/accommodations"
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              label="stays"
            />
          </>
        )}
      </ListingSection>
    </PublicShellServer>
  );
}
