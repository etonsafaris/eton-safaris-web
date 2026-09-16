import type { Metadata } from 'next';
import { publicRecordMetadata } from '@/lib/seo-public';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return publicRecordMetadata('tours', params.slug, `/tours/${params.slug}`, { contentType: 'tour' });
}

export default function TourDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
