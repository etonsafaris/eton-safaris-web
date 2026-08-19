import type { Metadata } from 'next';
import CommunityPageClient from '@/components/public/CommunityPageClient';
import JsonLd from '@/components/public/JsonLd';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

export async function generateMetadata(): Promise<Metadata> {
  const seeded = DEFAULT_CMS_PAGES.find((item) => item.slug === 'community-support');
  try {
    const rows = await fetchCollectionRecords('pages');
    const row = matchCmsRecord(rows, 'community-support', pageAliases('community-support'));
    const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
    return metadataFromSeo(values, {
      title: values.seo_title || (row && getRecordTitle(row)) || seeded?.seo_title || 'Community Support',
      description: values.meta_description || (row && pickString(row, ['excerpt', 'meta_description'])) || seeded?.meta_description,
      path: '/community-support',
      image: (row && getRecordImage(row)) || seeded?.image_url,
    });
  } catch {
    return { title: seeded?.seo_title || 'Community Support', description: seeded?.meta_description };
  }
}

export default function CommunityPage() {
  return (
    <>
      <JsonLd table="pages" slug="community-support" path="/community-support" schemaHint="WebPage" />
      <CommunityPageClient />
    </>
  );
}
