import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageFaqList from '@/components/public/PageFaqList';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShell from '@/components/public/PublicShell';
import { bestFaqsFor } from '@/lib/best-faqs';
import { loadAccommodationsPageData } from '@/lib/load-public';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { Metadata } from 'next';

export { revalidate } from '@/lib/public-page-config';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'Safari Accommodations',
  description: 'Browse our curated selection of safari lodges, camps, and hotels across Uganda, Kenya, Tanzania, and Rwanda. From luxury lodges to mid-range camps.',
  alternates: {
    canonical: 'https://etonsafaris.com/accommodations',
  },
};

export default async function AccommodationsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { rows, total } = await loadAccommodationsPageData({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <PublicShell>
      <PageHero
        title="Accommodations"
        subtitle={`${total.toLocaleString()} lodges, camps, hotels, and bandas`}
        image={rows[0] ? getRecordImage(rows[0]) : undefined}
        published={rows[0] ? recordPublishedAt(rows[0]) || undefined : undefined}
      />
      <ListingSection>
        {rows.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {rows.map((item, index) => (
                <PublicListingCard
                  key={String(item.id ?? index)}
                  href={`/accommodations/${publicRecordSlug(item)}`}
                  image={getRecordImage(item) || undefined}
                  title={getRecordTitle(item)}
                  date={formatPublishedDate(item)}
                  location={pickString(item, ['type', 'location', 'country'])}
                  description={recordCardBlurb(item)}
                  cta="Read More"
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
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('accommodations')} tone="light" />
      </div>
    </PublicShell>
  );
}
