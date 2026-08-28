import SafariUpdatesPageClient from '@/components/public/SafariUpdatesPageClient';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

export default function SafariUpdatesPage() {
  return <SafariUpdatesPageClient initialPosts={[]} initialTotal={0} />;
}
