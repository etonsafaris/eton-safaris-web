import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SafariUpdateDetailClient from './SafariUpdateDetailClient';
import { loadSafariUpdateDetail } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export { dynamic, fetchCache, revalidate } from '@/lib/public-page-config';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return publicRecordMetadata('safari_updates', params.slug, `/safari-updates/${params.slug}`, {
    contentType: 'article',
  });
}

export default async function SafariUpdateDetailPage({ params }: PageProps) {
  const { post, related, tours } = await loadSafariUpdateDetail(params.slug);
  if (!post) notFound();
  return (
    <SafariUpdateDetailClient
      key={params.slug}
      initialPost={post}
      initialRelated={related}
      initialTours={tours}
    />
  );
}
