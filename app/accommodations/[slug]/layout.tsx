import type { Metadata } from 'next';
import { publicRecordMetadata } from '@/lib/seo-public';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return publicRecordMetadata('accommodations', params.slug, `/accommodations/${params.slug}`, {
    contentType: 'stay',
  });
}

export default function AccommodationDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
