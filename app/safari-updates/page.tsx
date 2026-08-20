import SafariUpdatesPageClient from '@/components/public/SafariUpdatesPageClient';
import { loadPublishedRecords } from '@/lib/load-public';
import { isLanguagePost } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SafariUpdatesPage() {
  const posts = (await loadPublishedRecords('safari_updates')).filter((row) => !isLanguagePost(row));
  return <SafariUpdatesPageClient initialPosts={posts} />;
}
