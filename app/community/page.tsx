import type { Metadata } from 'next';
import { cache } from 'react';
import CommunityPageClient from '@/components/public/CommunityPageClient';
import JsonLd from '@/components/public/JsonLd';
import { loadCmsPageResilient } from '@/lib/load-public';
import { getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

export { revalidate } from '@/lib/public-page-config';

const loadCommunityPage = cache(() => loadCmsPageResilient('community-support'));

export async function generateMetadata(): Promise<Metadata> {
  const row = await loadCommunityPage();
  const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
  return metadataFromSeo(values, {
    title: values.seo_title || (row && getRecordTitle(row)) || 'Community Support',
    description: values.meta_description || (row && pickString(row, ['excerpt', 'meta_description'])) || undefined,
    path: '/community-support',
    image: (row && getRecordImage(row)) || undefined,
  });
}

export default async function CommunityPage() {
  const page = await loadCommunityPage();
  return (
    <>
      <JsonLd table="pages" slug="community-support" path="/community-support" schemaHint="WebPage" />
      <CommunityPageClient initialPage={page} />
    </>
  );
}
