import type { Metadata } from 'next';
import { DEFAULT_CMS_PAGES } from '@/lib/cms-defaults';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, pickString } from '@/lib/data';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

export async function generateMetadata(): Promise<Metadata> {
  const seeded = DEFAULT_CMS_PAGES.find((item) => item.slug === 'contact-us');
  try {
    const rows = await fetchCollectionRecords('pages');
    const row = matchCmsRecord(rows, 'contact-us', pageAliases('contact-us'));
    const values = seoValuesFromRecord((row || {}) as Record<string, unknown>);
    return metadataFromSeo(values, {
      title: values.seo_title || (row && getRecordTitle(row)) || seeded?.seo_title || 'Contact Us',
      description:
        values.meta_description || (row && pickString(row, ['excerpt', 'meta_description'])) || seeded?.meta_description,
      path: '/contact-us',
      image: (row && getRecordImage(row)) || seeded?.image_url,
    });
  } catch {
    return { title: seeded?.seo_title || 'Contact Us', description: seeded?.meta_description };
  }
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
