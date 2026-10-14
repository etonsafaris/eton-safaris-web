import PageHero from '@/components/public/PageHero';
import PublicShellServer from '@/components/public/PublicShellServer';
import SafariUpdatesListingClient from '@/components/public/SafariUpdatesListingClient';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
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

export default function SafariUpdatesPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);

  return (
    <PublicShellServer>
      <PageHero
        variant="update"
        title={PUBLIC_SITE_LABELS.blogPosts}
        subtitle="Safari news and travel notes"
      />
      <SafariUpdatesListingClient initialPosts={[]} initialTotal={0} page={page} pageSize={PAGE_SIZE} />
    </PublicShellServer>
  );
}
