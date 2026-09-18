import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SafariUpdateDetailClient from './SafariUpdateDetailClient';
import { loadSafariUpdateDetail, loadStaticSafariUpdateParams } from '@/lib/load-public';
import { publicRecordMetadata } from '@/lib/seo-public';

export const revalidate = 900;
export const dynamicParams = true;

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  return loadStaticSafariUpdateParams();
}

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
