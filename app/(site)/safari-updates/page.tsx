import { Suspense } from 'react';
import PublicShellServer from '@/components/public/PublicShellServer';
import SafariUpdatesListingClient from '@/components/public/SafariUpdatesListingClient';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import { getPublicRecordImage } from '@/lib/content-image';
import { loadSafariUpdatesListingResilient } from '@/lib/load-public';
import { preloadPublicHero } from '@/lib/preload-public-hero';
import { rethrowDynamicServerError } from '@/lib/safe-public-load';
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

async function SafariUpdatesReady({ page }: { page: number }) {
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
    rethrowDynamicServerError(error);
    console.warn('[Public] Safari updates listing failed:', error);
  }
  preloadPublicHero(posts[0] ? getPublicRecordImage(posts[0]) : '');
  return <SafariUpdatesListingClient initialPosts={posts} initialTotal={total} page={page} pageSize={PAGE_SIZE} showHero />;
}

export default function SafariUpdatesPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  return (
    <PublicShellServer>
      <Suspense fallback={<SafariUpdatesListingClient initialPosts={[]} initialTotal={0} page={page} pageSize={PAGE_SIZE} showHero />}>
        <SafariUpdatesReady page={page} />
      </Suspense>
    </PublicShellServer>
  );
}
