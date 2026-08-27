import SafariUpdatesPageClient from '@/components/public/SafariUpdatesPageClient';
import { fetchCollectionPage, isLanguagePost, isPublishedRecord } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SafariUpdatesPage() {
  const page = await fetchCollectionPage('safari_updates', [], { limit: 48, offset: 0 }).catch(() => ({
    rows: [] as Awaited<ReturnType<typeof fetchCollectionPage>>['rows'],
    total: 0,
  }));
  const posts = page.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row));
  return <SafariUpdatesPageClient initialPosts={posts} initialTotal={page.total} />;
}
