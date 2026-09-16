import type { Metadata } from 'next';
import { publicRecordMetadata } from '@/lib/seo-public';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return publicRecordMetadata('national_park', params.slug, `/parks/${params.slug}`, {
    aliases: ['national_parks', 'parks'],
    contentType: 'park',
  });
}

export default function ParkDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
