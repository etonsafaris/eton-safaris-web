import { publicCanonicalUrl } from '@/lib/seo-canonical';
import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Safari Tours',
  robots: { index: false, follow: true },
  alternates: { canonical: publicCanonicalUrl('/tours') },
};

/** Listing hub hidden from browse; /explore/[slug] stays in the sitemap. */
export default function ExploreListingPage() {
  permanentRedirect('/tours');
}
