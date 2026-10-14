import { Suspense } from 'react';
import JsonLd from '@/components/public/JsonLd';
import { SITE } from '@/lib/collections';
import { countrySlugFromLanding, destinationPublicPath } from '@/lib/cms-routes';
import { countryHeroTitle, countryMetaDescription } from '@/lib/country-landing-copy';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { publicCanonicalUrl } from '@/lib/seo-canonical';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  const label = countryLabelFromSlug(slug) || slug;
  const headline = countryHeroTitle(slug, label);
  const description = countryMetaDescription(slug, label);
  return {
    title: headline,
    description,
    openGraph: {
      title: headline,
      description,
      siteName: SITE.name,
      url: publicCanonicalUrl(destinationPublicPath(slug)),
    },
    alternates: { canonical: destinationPublicPath(slug) },
  };
}

export default function DestinationSeoLayout({ children, params }: LayoutProps) {
  const slug = countrySlugFromLanding(params.slug);
  return (
    <>
      <Suspense fallback={null}>
        <JsonLd
          table="countries"
          slug={slug}
          path={destinationPublicPath(slug)}
          schemaHint="TouristDestination"
        />
      </Suspense>
      {children}
    </>
  );
}
