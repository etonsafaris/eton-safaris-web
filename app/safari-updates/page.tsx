import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PublicListingCard from '@/components/public/PublicListingCard';
import PublicShell from '@/components/public/PublicShell';
import { loadSafariUpdatesPageData } from '@/lib/load-public';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { SITE_MEDIA } from '@/lib/site-media';
import { Metadata } from 'next';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'Safari Updates',
  description: 'Stay updated with the latest safari news, travel tips, and wildlife conservation updates from Eton Safaris across East Africa.',
  alternates: {
    canonical: 'https://etonsafaris.com/safari-updates',
  },
};

export default async function SafariUpdatesPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { posts, total } = await loadSafariUpdatesPageData({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const latest = posts[0];

  return (
    <PublicShell>
      <PageHero
        title="Safari Updates"
        subtitle={
          total ? `${total.toLocaleString()} safari stories and travel notes` : 'Safari news and travel notes'
        }
        image={SITE_MEDIA.safariUpdatesHero}
        published={latest ? recordPublishedAt(latest) || undefined : undefined}
      />
      <ListingSection>
        {posts.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {posts.map((post, index) => (
                <PublicListingCard
                  key={String(post.id ?? index)}
                  href={`/safari-updates/${publicRecordSlug(post)}`}
                  image={getRecordImage(post) || undefined}
                  title={getRecordTitle(post)}
                  date={formatPublishedDate(post)}
                  description={recordCardBlurb(post)}
                  cta="Read More"
                />
              ))}
            </ListingGrid>
            <ListingPager
              basePath="/safari-updates"
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              label="updates"
            />
          </>
        )}
      </ListingSection>
    </PublicShell>
  );
}
