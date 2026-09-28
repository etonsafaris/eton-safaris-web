import HomePageClient from '@/components/public/HomePageClient';
import PublicShellServer from '@/components/public/PublicShellServer';
import { buildHomeHeroSlides } from '@/lib/home-hero-slides';
import { officialCountryHeroPath } from '@/lib/official-country-assets';
import { prepareHomePageRenderState } from '@/lib/home-page-fallback';
import { safeHeroSlides, type HomePagePayload } from '@/lib/home-page-payload';
import { loadHomePageBundleResilient } from '@/lib/load-public';
import { NAV_COUNTRIES } from '@/lib/collections';
import { publicCanonicalUrl } from '@/lib/seo-canonical';
import type { PublicDestination } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';
import { Metadata } from 'next';

/** ISR: serve cached HTML at the edge; refresh from Aiven every 15 minutes. */
export const revalidate = 900;

export const metadata: Metadata = {
  title: {
    absolute: 'Eton Safaris | Africa & Beyond',
  },
  description:
    'Premier gorilla trekking, wildlife safaris, and tailor-made luxury expeditions across Uganda, Kenya, Tanzania, Rwanda, and beyond.',
  alternates: {
    canonical: publicCanonicalUrl('/'),
  },
  robots: { index: true, follow: true },
};

function safeRecordRows(value: unknown): RecordRow[] {
  try {
    if (!Array.isArray(value)) return [];
    return value.filter((row) => row != null && typeof row === 'object') as RecordRow[];
  } catch {
    return [];
  }
}

function pickFeaturedTours(tours: RecordRow[]): RecordRow[] {
  try {
    const pool = tours ?? [];
    const preferred = pool?.filter(
      (tour) => tour?.is_featured || tour?.is_popular || tour?.show_on_landing
    );
    const list = (preferred?.length ? preferred : pool)?.slice(0, 12) ?? [];
    return list;
  } catch (error) {
    console.warn('[Public] Home featured tours pick failed:', error);
    return [];
  }
}

function pickHomeCountries(countries: RecordRow[]): RecordRow[] {
  try {
    return countries?.slice(0, 48) ?? [];
  } catch (error) {
    console.warn('[Public] Home countries slice failed:', error);
    return [];
  }
}

function pickHomeCategories(categories: RecordRow[]): RecordRow[] {
  try {
    return (categories ?? [])?.filter((row) => row && (row?.id != null || row?.name || row?.title)) ?? [];
  } catch (error) {
    console.warn('[Public] Home categories pick failed:', error);
    return [];
  }
}

/** Defensive map for server-prepared lists — never throw into the page error boundary. */
function safeHomeListMap<T>(
  items: T[] | null | undefined,
  mapper: (item: T, index: number) => RecordRow | null
): RecordRow[] {
  try {
    const out: RecordRow[] = [];
    for (let index = 0; index < (items?.length ?? 0); index += 1) {
      const item = items?.[index];
      if (item == null) continue;
      try {
        const mapped = mapper(item, index);
        if (mapped) out.push(mapped);
      } catch (rowError) {
        console.warn('[Public] Home list row skipped:', rowError);
      }
    }
    return out;
  } catch (error) {
    console.warn('[Public] Home list map failed:', error);
    return [];
  }
}

export default async function HomePage() {
  let homeContent = null;
  let destinations: PublicDestination[] | undefined;
  let needsClientRefresh = false;
  let payload: HomePagePayload = {
    countries: [],
    tours: [],
    updates: [],
    categories: [],
  };

  try {
    const bundle = await loadHomePageBundleResilient();
    const state = prepareHomePageRenderState(bundle);
    homeContent = state.homeContent;
    destinations = state.destinations;
    needsClientRefresh = state.needsClientRefresh;
    payload = state.data;
  } catch (error) {
    console.error('[Public] Home page bundle failed:', error);
  }

  const countries = safeRecordRows(payload?.countries);
  const tours = safeRecordRows(payload?.tours);
  const updates = safeRecordRows(payload?.updates);
  const categories = safeRecordRows(payload?.categories);

  let initialHeroSlides = safeHeroSlides([]);
  try {
    initialHeroSlides = safeHeroSlides(buildHomeHeroSlides(countries));
  } catch (error) {
    console.warn('[Public] Home hero slides failed:', error);
  }

  const lcpHero =
    initialHeroSlides?.[0]?.image || officialCountryHeroPath(NAV_COUNTRIES?.[0]?.slug || 'uganda');

  let featuredTours: RecordRow[] = [];
  let homeCountries: RecordRow[] = [];
  let homeCategories: RecordRow[] = [];

  try {
    featuredTours = pickFeaturedTours(tours);
    homeCountries = pickHomeCountries(countries);
    homeCategories = pickHomeCategories(categories);
  } catch (error) {
    console.warn('[Public] Home featured data pick failed:', error);
  }

  const tourPayload = safeHomeListMap(featuredTours?.length ? featuredTours : tours, (row) => row ?? null);
  const countryPayload = safeHomeListMap(homeCountries, (row) => row ?? null);
  const categoryPayload = safeHomeListMap(homeCategories, (row) => row ?? null);
  const updatePayload = safeHomeListMap(updates, (row) => row ?? null);

  return (
    <>
      <link rel="preload" as="image" href={lcpHero} fetchPriority="high" />
      <PublicShellServer initialDestinations={destinations}>
        <HomePageClient
          initialHeroSlides={initialHeroSlides ?? []}
          initialCountries={countryPayload ?? []}
          initialTours={tourPayload?.length ? tourPayload : tours ?? []}
          initialUpdates={updatePayload ?? []}
          initialCategories={categoryPayload ?? []}
          initialHomeContent={homeContent}
          needsClientRefresh={needsClientRefresh}
        />
      </PublicShellServer>
    </>
  );
}
