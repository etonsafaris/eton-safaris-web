import type { Metadata } from 'next';
import { PUBLIC_SITE_LABELS, SITE } from '@/lib/collections';

export const metadata: Metadata = {
  title: PUBLIC_SITE_LABELS.blogPosts,
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
