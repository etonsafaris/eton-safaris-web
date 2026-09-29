import JsonLd from '@/components/public/JsonLd';
import { countrySlugFromLanding, destinationPublicPath } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  try {
    return await publicRecordMetadata('countries', slug, destinationPublicPath(slug));
  } catch {
    const label = countryLabelFromSlug(slug) || slug;
    return { title: `${label} Safaris | Eton Safaris` };
  }
}

export default function DestinationSeoLayout({ children, params }: LayoutProps) {
  const slug = countrySlugFromLanding(params.slug);
  return (
    <>
      <JsonLd
        table="countries"
        slug={slug}
        path={destinationPublicPath(slug)}
        schemaHint="TouristDestination"
      />
      {children}
    </>
  );
}
