import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageFaqList from '@/components/public/PageFaqList';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShell from '@/components/public/PublicShell';
import { bestFaqsFor } from '@/lib/best-faqs';
import { loadParksPageData } from '@/lib/load-public';
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

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'National Parks',
  description: 'Explore Africa\'s national parks and wildlife reserves with Eton Safaris. From Bwindi Impenetrable Forest to Serengeti, discover the best safari destinations.',
  alternates: {
    canonical: 'https://etonsafaris.com/parks',
  },
};

export default async function ParksPage({
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
    <PublicShell>
      <PageHero
        title="National Parks"
        subtitle={`${total.toLocaleString()} national parks and reserves across Africa`}
        image={parks[0] ? getRecordImage(parks[0]) : undefined}
        published={parks[0] ? recordPublishedAt(parks[0]) || undefined : undefined}
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
                  date={formatPublishedDate(park)}
                  location={pickString(park, ['location', 'country'])}
                  description={recordCardBlurb(park)}
                  cta="Read More"
                />
              ))}
            </ListingGrid>
            <ListingPager basePath="/parks" page={page} pageSize={PAGE_SIZE} total={total} label="parks" />
          </>
        )}
      </ListingSection>
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('parks')} tone="light" />
      </div>
    </PublicShell>
  );
}
