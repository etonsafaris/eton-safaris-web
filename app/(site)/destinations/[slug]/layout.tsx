import { Suspense } from 'react';
import JsonLd from '@/components/public/JsonLd';
import { countrySlugFromLanding, destinationPublicPath } from '@/lib/cms-routes';
import { countryHeroTitle } from '@/lib/country-landing-copy';
import { countryLabelFromSlug } from '@/lib/country-utils';

type LayoutProps = {
  children: React.ReactNode;
  params: { slug: string };
};

export function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(params.slug);
  const label = countryLabelFromSlug(slug) || slug;
  return {
    title: countryHeroTitle(slug, label),
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
