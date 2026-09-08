import SafariUpdatesPageClient from '@/components/public/SafariUpdatesPageClient';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Safari Updates | Eton Safaris',
  description: 'Stay updated with the latest safari news, travel tips, and wildlife conservation updates from Eton Safaris across East Africa.',
  alternates: {
    canonical: 'https://etonsafaris.com/safari-updates',
  },
};

export default function SafariUpdatesPage() {
  return <SafariUpdatesPageClient initialPosts={[]} initialTotal={0} />;
}
