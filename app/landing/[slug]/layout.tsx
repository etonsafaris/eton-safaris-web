import JsonLd from '@/components/public/JsonLd';
import {
  countrySlugFromLanding,
  landingCmsSlug,
  landingPreviewPath,
  matchCmsRecord,
} from '@/lib/cms-routes';
import { DEFAULT_LANDING_PAGES } from '@/lib/cms-defaults';
import { parseCmsPageExtras, stripHtmlText } from '@/lib/cms-page-model';
import { fetchCollectionRecords, getRecordImage } from '@/lib/data';
import { publicCountryLabel, recordMatchesCountrySlug } from '@/lib/country-utils';
import { seoValuesFromRecord } from '@/lib/seo';
import { metadataFromSeo } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const canonical = landingCmsSlug(params.slug);
  const countrySlug = countrySlugFromLanding(canonical);
  const seeded = DEFAULT_LANDING_PAGES.find((item) => item.slug === canonical);
  try {
    const [landingRows, countryRows] = await Promise.all([
      fetchCollectionRecords('landing_pages'),
      fetchCollectionRecords('countries'),
    ]);
    const landing = matchCmsRecord(landingRows, canonical, [countrySlug]);
    const country = countryRows.find((row) => recordMatchesCountrySlug(row, countrySlug)) || null;
    const extras = parseCmsPageExtras(landing, canonical);
    const values = seoValuesFromRecord((landing || country || {}) as Record<string, unknown>);
    const countryName =
      publicCountryLabel(country, countrySlug) || seeded?.country || countrySlug;
    const h1 = extras.hero_title || `${countryName} Safaris`;
    if (!values.focus_keywords?.length) {
      values.focus_keywords = [`${countryName} safari`, 'Eton Safaris'];
    }
    values.schema_type = 'TouristDestination';
    values.robots_index = false;
    values.robots_follow = false;
    return {
      ...metadataFromSeo(values, {
        title: values.seo_title || `${h1} - Eton Safaris, Tour, Travel, Hotel Booking, Uganda`,
        description: stripHtmlText(
          values.meta_description || extras.excerpt || seeded?.meta_description || '',
          160
        ),
        path: `/landing/${canonical}`,
        image: (landing && getRecordImage(landing)) || (country && getRecordImage(country)) || seeded?.image_url,
      }),
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: seeded?.seo_title || 'Safari',
      description: seeded?.meta_description,
      robots: { index: false, follow: false },
    };
  }
}

export default function LandingSeoLayout({ children, params }: LayoutProps) {
  const canonical = landingCmsSlug(params.slug);
  return (
    <>
      <JsonLd
        table="landing_pages"
        slug={canonical}
        path={landingPreviewPath(canonical)}
        schemaHint="TouristDestination"
      />
      {children}
    </>
  );
}
