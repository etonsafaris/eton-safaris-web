import SafariUpdatesPageClient from '@/components/public/SafariUpdatesPageClient';

export const revalidate = 60;

export default function SafariUpdatesPage() {
  return <SafariUpdatesPageClient initialPosts={[]} initialTotal={0} />;
}
