import PageHero from '@/components/public/PageHero';
import PublicShellServer from '@/components/public/PublicShellServer';
import SafariUpdatesListingClient from '@/components/public/SafariUpdatesListingClient';
import { loadSafariUpdatesListingResilient } from '@/lib/load-public';
import { recordPublishedAt } from '@/lib/data';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import { SITE_MEDIA } from '@/lib/site-media';
import { Metadata } from 'next';

export { revalidate } from '@/lib/public-page-config';
export const dynamicParams = true;

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: PUBLIC_SITE_LABELS.blogPosts,
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
  let posts: Awaited<ReturnType<typeof loadSafariUpdatesListingResilient>>['posts'] = [];
  let total = 0;
  try {
    const loaded = await loadSafariUpdatesListingResilient({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    posts = loaded.posts ?? [];
    total = loaded.total ?? 0;
  } catch (error) {
    console.warn('[Public] Safari updates listing failed:', error);
  }
  const latest = posts?.[0];

  return (
    <PublicShellServer>
      <PageHero
        variant="update"
        title={PUBLIC_SITE_LABELS.blogPosts}
        subtitle={
          total ? `${total.toLocaleString()} safari stories and travel notes` : 'Safari news and travel notes'
        }
        image={SITE_MEDIA.safariUpdatesHero || SITE_MEDIA.wildlifeNationalPark || SITE_MEDIA.elephantSunset}
        published={latest ? recordPublishedAt(latest) || undefined : undefined}
      />
      <SafariUpdatesListingClient
        initialPosts={posts}
        initialTotal={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </PublicShellServer>
  );
}
