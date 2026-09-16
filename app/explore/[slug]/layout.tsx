import type { Metadata } from 'next';
import { publicRecordMetadata } from '@/lib/seo-public';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return publicRecordMetadata('explore', params.slug, `/explore/${params.slug}`, { contentType: 'place' });
}

export default function ExploreDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
