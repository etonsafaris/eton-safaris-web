import { notFound } from 'next/navigation';
import CountryPageContent from '@/components/public/CountryPageContent';
import PublicShellServer from '@/components/public/PublicShellServer';
import { countrySlugFromLanding, landingCmsSlug } from '@/lib/cms-routes';
import { countryLabelFromSlug } from '@/lib/country-utils';
import { loadCountryPageData } from '@/lib/load-public';

/**
 * Admin-only preview (guests are redirected to /destinations/{country} in middleware).
 * Uses the same country UI as the live public site — not the legacy conversion landing layout.
 */
export default async function LandingAdminPreviewPage({ params }: { params: { slug: string } }) {
  const slug = countrySlugFromLanding(landingCmsSlug(params.slug));
  if (!slug) notFound();

  let data;
  try {
    data = await loadCountryPageData(slug);
  } catch (error) {
    console.error('[Landing preview] Failed to load country:', error);
    notFound();
  }
  if (!data.country) notFound();

  const country =
    data.country ||
    ({
      name: countryLabelFromSlug(slug),
      title: countryLabelFromSlug(slug),
      slug,
    } as const);

  return (
    <PublicShellServer>
      <CountryPageContent
        key={slug}
        slug={slug}
        country={country}
        initialCategories={data.categories}
        initialTours={data.tours}
        initialParks={data.parks}
        initialPlaces={data.places}
        initialStays={data.stays}
      />
    </PublicShellServer>
  );
}
