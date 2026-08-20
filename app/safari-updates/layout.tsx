import type { Metadata } from 'next';
import { SITE } from '@/lib/collections';

export const metadata: Metadata = {
  title: 'Safari Updates',
  description: 'Safari news, gorilla trekking notes, and East Africa travel updates from Eton Safaris.',
  alternates: {
    types: {
      'application/rss+xml': `${SITE.url}/safari-updates/rss.xml`,
    },
  },
};

export default function SafariUpdatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
