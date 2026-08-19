import JsonLd from '@/components/public/JsonLd';
import { countrySlugFromLanding, destinationPublicPath } from '@/lib/cms-routes';
import { publicRecordMetadata } from '@/lib/seo-public';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  return publicRecordMetadata('countries', slug, destinationPublicPath(slug));
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
