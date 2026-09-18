import type { Metadata } from 'next';
import { publicRecordMetadata } from '@/lib/seo-public';

export { revalidate } from '@/lib/public-page-config';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return publicRecordMetadata('safari_updates', params.slug, `/safari-updates/${params.slug}`, {
    contentType: 'article',
  });
}

export default function SafariUpdateDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
