'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveCountryCategoryCardImage } from '@/lib/category-display-image';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import Carousel from '@/components/public/Carousel';
import SafariCategoryCard from '@/components/public/SafariCategoryCard';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import Link from 'next/link';
import PageHero from '@/components/public/PageHero';
import CountrySectionHeading from '@/components/public/CountrySectionHeading';
import PlaceCard from '@/components/public/PlaceCard';
import { countryPlacePath } from '@/lib/cms-routes';
import { countryExploreListingPath, countryParksListingPath } from '@/lib/listing-paths';
import { isCountryPageShellCountry } from '@/lib/country-heroes';
import { showExploreOnCountryPages, showParksOnCountryPages } from '@/lib/public-discovery-policy';
import { categoryPublicSlug, countryCategoryPath, publicCountryLabel } from '@/lib/country-utils';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import { resolveCountryDescriptionHtml } from '@/lib/country-page-copy';
import { COUNTRY_SPECIALISTS_LINE } from '@/lib/country-landing-copy';
import { countryHeroImage, countryPageHeroTitle } from '@/lib/country-heroes';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import {
  getRecordImage,
  getRecordTitle,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import PageFaqList from '@/components/public/PageFaqList';
import { fetchJsonSafe } from '@/lib/safe-client-fetch';
import { bestTimeToVisit } from '@/lib/country-planning';
import type { RecordRow } from '@/lib/types';

type CountryPageContentProps = {
  slug: string;
  country: RecordRow | null;
  heroTitle?: string;
  initialCategories?: RecordRow[];
  initialTours?: RecordRow[];
  initialParks?: RecordRow[];
  initialPlaces?: RecordRow[];
};

function toProseHtml(value: string) {
  const cleaned = publicBodyHtml(value).trim();
  if (!cleaned) return '';
  if (/<[a-z][\s\S]*>/i.test(cleaned)) return cleaned;
  return cleaned
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export default function CountryPageContent({
  slug,
  country: countryProp,
  heroTitle,
  initialCategories = [],
  initialTours = [],
  initialParks = [],
  initialPlaces = [],
}: CountryPageContentProps) {
  const [country, setCountry] = useState<RecordRow | null>(countryProp);
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [parks, setParks] = useState<RecordRow[]>(initialParks);
  const [places, setPlaces] = useState<RecordRow[]>(initialPlaces);
  const [ready, setReady] = useState(true);
  /** A name-only shell means the country row did not load. Refetch instead of keeping the blank page. */
  const hasServerContent = Boolean(slug && countryProp && !isCountryPageShellCountry(countryProp));

  useEffect(() => {
    setCountry(countryProp);
    setCategories(initialCategories);
    setTours(initialTours);
    setParks(initialParks);
    setPlaces(initialPlaces);
  }, [countryProp, initialCategories, initialTours, initialParks, initialPlaces]);

  useCmsPageReload(async () => {
    try {
      const body = await fetchJsonSafe<{
        country?: RecordRow | null;
        categories?: RecordRow[];
        tours?: RecordRow[];
        parks?: RecordRow[];
        places?: RecordRow[];
      }>(`/api/public/country-page?slug=${encodeURIComponent(slug)}`);
      if (!body) return;
      if (body.country) setCountry(body.country);
      if (Array.isArray(body.categories)) setCategories(body.categories);
      if (body.tours?.length) setTours(body.tours);
      if (showParksOnCountryPages() && body.parks?.length) setParks(body.parks);
      if (showExploreOnCountryPages() && body.places?.length) setPlaces(body.places);
    } catch (error) {
      console.error('[Country page] Live refresh failed:', error);
    } finally {
      setReady(true);
    }
  }, hasServerContent, [slug]);

  const extras = parseCmsPageExtras(country, slug);
  const title = publicCountryLabel(country, slug);
  const bannerTitle = countryPageHeroTitle(slug, country, heroTitle);
  const faqs = limitFaqs(extras.faqs, bestFaqsFor('country', { countrySlug: slug, countryName: title }));
  const visitTime = bestTimeToVisit(slug, title, extras.best_time_to_visit);
  const published = useEnsurePublishedAt('countries', country, extras.published_at);

  const descriptionHtml = resolveCountryDescriptionHtml(slug, country);
  const summaryHtml = toProseHtml(extras.excerpt) || toProseHtml(country ? visibleRecordHtml(country, ['summary']) : '');
  const summaryIsDistinct =
    Boolean(summaryHtml) &&
    summaryHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() !==
      descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const categoryItems = useMemo(() => {
    try {
      return (categories ?? [])
        .filter((category) => category && (getRecordTitle(category) || category.slug))
        .map((category, index) => (
          <SafariCategoryCard
            key={String(category?.id ?? categoryPublicSlug(category) ?? index)}
            category={category}
            titleOnly
            href={countryCategoryPath(slug, category)}
            image={resolveCountryCategoryCardImage(category, { countrySlug: slug, tours })}
          />
        ));
    } catch (error) {
      console.error('[Country page] Category carousel failed:', error);
      return [];
    }
  }, [categories, slug, tours]);

  return (
    <>
      <PageHero
        title={bannerTitle}
        image={countryHeroImage(slug, country)}
        variant="country"
        bestTime={visitTime}
        country={title}
        published={published || undefined}
      />

      <section className="bg-[#f3f3f3] px-4 py-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <h2 className="font-serif text-[28px] font-medium italic text-[#343434] md:text-[32px]">
              Where you can travel with us in {title}
            </h2>
            <p className="mx-auto mt-2 max-w-3xl text-base leading-6 text-[#222]">
              {COUNTRY_SPECIALISTS_LINE}
            </p>
          </div>
          <div className="mt-8">
            <Carousel
              items={categoryItems}
              centered
              itemWidth={200}
              gap={20}
              autoPlayMs={4500}
              emptyMessage="No records found in this collection."
            />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            {descriptionHtml ? (
              <PublicHtml className="public-prose" html={descriptionHtml} />
            ) : null}
            {summaryIsDistinct ? (
              <PublicHtml className="public-prose mt-8" html={summaryHtml} />
            ) : null}
            <PageFaqList faqs={faqs} tone="light" className="mt-10" />
          </div>
          <div className="md:col-span-1">
            <div className="md:sticky md:top-24">
              <SpeakToExpertCard variant="country" countryName={title} />
            </div>
          </div>
        </div>
      </section>

      {showParksOnCountryPages() && (parks?.length ?? 0) > 0 ? (
        <section className="bg-[#f3f3f3] px-4 py-12">
          <div className="mx-auto max-w-[1200px]">
            <CountrySectionHeading>National Parks in {title}</CountrySectionHeading>
            <div className="mt-8">
              <Carousel
                items={(parks ?? []).map((park, index) => {
                  if (!park) return null;
                  const parkSlug = publicRecordSlug(park);
                  return (
                    <PlaceCard
                      key={String(park?.id ?? index)}
                      href={parkSlug ? `/parks/${parkSlug}` : '/parks'}
                      image={getRecordImage(park) || undefined}
                      title={getRecordTitle(park)}
                      location={pickString(park, ['location', 'country'])}
                      description={recordCardBlurb(park)}
                      record={park}
                      cta="View Park"
                    />
                  );
                })}
                itemsPerView={{ sm: 1, md: 2, lg: 4 }}
                instant
                autoPlayMs={5000}
              />
            </div>
            <div className="mt-8 text-center">
              <Link
                href={countryParksListingPath(slug)}
                className="inline-flex rounded-full border-2 border-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
              >
                Other Parks
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {showExploreOnCountryPages() && (places?.length ?? 0) > 0 ? (
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-[1200px]">
            <CountrySectionHeading>Explore {title}</CountrySectionHeading>
            <div className="mt-8">
              <Carousel
                items={(places ?? []).map((place, index) => {
                  if (!place) return null;
                  const placeSlug = publicRecordSlug(place);
                  const href = placeSlug ? countryPlacePath(slug, place) : '/explore';
                  return (
                    <PlaceCard
                      key={String(place?.id ?? index)}
                      href={href}
                      image={getRecordImage(place) || undefined}
                      title={getRecordTitle(place)}
                      location={pickString(place, ['location', 'country'])}
                      description={recordCardBlurb(place)}
                      record={place}
                      cta="Explore"
                    />
                  );
                })}
                itemsPerView={{ sm: 1, md: 2, lg: 4 }}
                instant
                autoPlayMs={5400}
              />
            </div>
            <div className="mt-8 text-center">
              <Link
                href={countryExploreListingPath(slug)}
                className="inline-flex rounded-full border-2 border-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
              >
                Other Places
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section id="tour-packages" className="bg-[#f3f6f5]">
        <AmazingSafaris
          tours={tours}
          title={`Explore These Amazing Safaris in ${title}`}
          emptyMessage={ready ? 'No tour package found. Try another search.' : undefined}
        />
      </section>
    </>
  );
}
