'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Carousel from '@/components/public/Carousel';
import PaymentsSection from '@/components/public/PaymentsSection';
import PublicShell from '@/components/public/PublicShell';
import ResponsiveImage from '@/components/public/ResponsiveImage';
import PlaceCard from '@/components/public/PlaceCard';
import TourSearchBar from '@/components/public/TourSearchBar';
import SectionHeading from '@/components/public/SectionHeading';
import TestimonialsSection from '@/components/public/TestimonialsSection';
import TourCard from '@/components/public/TourCard';
import WhatSetsUsApartSection from '@/components/public/WhatSetsUsApartSection';
import PageFaqList from '@/components/public/PageFaqList';
import { useHomePageContent } from '@/components/public/useHomePageContent';
import { NAV_COUNTRIES } from '@/lib/collections';
import { destinationPublicPath } from '@/lib/cms-routes';
import { canonicalCountrySlug, publicCountrySlug, publicCountryLabel, recordMatchesCountrySlug } from '@/lib/country-utils';
import {
  destinationListingRows,
  mergePublicDestinations,
  publicDestinationNames,
} from '@/lib/public-destinations';
import {
  fetchCollectionPage,
  fetchCollectionRecords,
  fetchFeaturedTours,
  getRecordImage,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickString,
  pickPlainText,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { countryHeroImage } from '@/lib/country-heroes';
import { stripPublicMoney } from '@/lib/public-money';
import { bestFaqsFor } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

const HERO_DEFAULTS: Record<string, { title: string; subtitle: string; image: string }> = {
  uganda: {
    title: 'Crafted Safaris Across the African Wild',
    subtitle:
      "Step into a world of untamed luxury — where every sunrise brings a new encounter with Africa's most extraordinary wildlife and landscapes",
    image: '/heroes/uganda.jpg',
  },
  kenya: {
    title: 'Where the Wild Meets Refined Comfort',
    subtitle:
      "From the Maasai Mara's endless plains to intimate bush dinners under the stars — experience Africa at its most captivating.",
    image: '/heroes/kenya.jpg',
  },
  rwanda: {
    title: 'The Land of a Thousand Hidden Wonders',
    subtitle:
      'Meet the gentle giants of Volcanoes National Park and discover friendly people, mountain gorillas, and stunning views of the great rift valley.',
    image: '/heroes/rwanda.jpg',
  },
  tanzania: {
    title: 'Witness the Great Migration',
    subtitle:
      'Witness the great wildebeest migration, climb Kilimanjaro, and discover Serengeti wildlife on unforgettable journeys.',
    image: '/heroes/tanzania.jpg',
  },
};

type HomePageClientProps = {
  initialCountries: RecordRow[];
  initialTours: RecordRow[];
  initialUpdates: RecordRow[];
  initialParks: RecordRow[];
  initialCategories: RecordRow[];
};

function HomeBrandAndFeatures() {
  const home = useHomePageContent();
  return (
    <>
      <section className="px-[30px] py-16 text-center">
        <h2 className="mb-2 font-serif text-[44px] font-normal uppercase leading-[1.2] text-[#588048] md:text-[70px] md:leading-[84px]">
          {home.brandTitle}
        </h2>
        <p className="text-justify text-base leading-6 text-[#222]">{home.brandDescription}</p>
      </section>
      <WhatSetsUsApartSection
        heading={home.setsApartHeading}
        intro={home.setsApartIntro}
        features={home.features}
        videos={home.videos}
      />
    </>
  );
}

export default function HomePageClient({
  initialCountries,
  initialTours,
  initialUpdates,
  initialParks,
  initialCategories,
}: HomePageClientProps) {
  const live = useCmsLive();
  const [slide, setSlide] = useState(0);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [updates, setUpdates] = useState<RecordRow[]>(initialUpdates);
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);
  const [parks, setParks] = useState<RecordRow[]>(initialParks);
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);

  useEffect(() => {
    setCountries(initialCountries);
    setTours(initialTours);
    setUpdates(initialUpdates);
    setParks(initialParks);
    setCategories(initialCategories);
  }, [initialCountries, initialTours, initialUpdates, initialParks, initialCategories]);

  useEffect(() => {
    // First paint uses server-loaded props. Only re-fetch after a CMS live bump.
    if (live === 0) return undefined;

    let cancelled = false;

    async function loadHero() {
      try {
        const rows = await fetchCollectionRecords('countries');
        if (!cancelled) setCountries(rows.filter(isPublishedRecord));
      } catch (error) {
        console.error('[Supabase] Failed to load countries:', error);
      }
    }

    async function loadRest() {
      const [tourRows, updateRows, parkRows, categoryRows] = await Promise.all([
        fetchFeaturedTours(24).catch((error) => {
          console.error('[Supabase] Failed to load tours:', error);
          return [] as RecordRow[];
        }),
        fetchCollectionPage('safari_updates', [], { limit: 12, offset: 0 })
          .then((page) => page.rows)
          .catch((error) => {
          console.error('[Supabase] Failed to load safari updates:', error);
          return [] as RecordRow[];
        }),
        fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 24, offset: 0 })
          .then((page) => page.rows)
          .catch((error) => {
          console.error('[Supabase] Failed to load national parks:', error);
          return [] as RecordRow[];
        }),
        fetchCollectionRecords('categories').catch((error) => {
          console.error('[Supabase] Failed to load categories:', error);
          return [] as RecordRow[];
        }),
      ]);
      if (cancelled) return;
      setTours(tourRows.slice(0, 24));
      setUpdates(updateRows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)).slice(0, 8));
      setParks(parkRows.filter(isPublishedRecord).slice(0, 24));
      setCategories(categoryRows);
    }

    loadHero();
    loadRest();
    return () => {
      cancelled = true;
    };
  }, [live]);

  const heroSlides = useMemo(() => {
    return NAV_COUNTRIES.map(({ slug, name }) => {
      const dbCountry = countries.find((row) => recordMatchesCountrySlug(row, slug));
      const defaults = HERO_DEFAULTS[slug] || {
        title: `Discover ${name}`,
        subtitle: `Discover unforgettable safari experiences in ${name}.`,
        image: '/heroes/kenya.jpg',
      };
      const label = dbCountry ? publicCountryLabel(dbCountry, slug) : name;
      return {
        title:
          (dbCountry ? pickString(dbCountry, ['hero_title', 'headline', 'banner_title']) : '') || defaults.title,
        subtitle:
          (dbCountry ? pickString(dbCountry, ['hero_subtitle', 'tagline', 'excerpt']) : '') || defaults.subtitle,
        cta: `Explore ${label}`,
        href: destinationPublicPath(slug),
        image: countryHeroImage(slug, dbCountry) || '',
      };
    });
  }, [countries]);

  useEffect(() => {
    if (heroSlides.length === 0) return undefined;
    const timer = setInterval(() => setSlide((value) => (value + 1) % heroSlides.length), 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length, slide]);

  function goHero(next: number) {
    if (heroSlides.length === 0) return;
    setSlide(((next % heroSlides.length) + heroSlides.length) % heroSlides.length);
  }

  const destinationOptions = useMemo(
    () => publicDestinationNames(mergePublicDestinations(countries)),
    [countries]
  );

  const current = heroSlides[slide] || heroSlides[0];

  const featuredTours = useMemo(() => {
    const preferred = tours.filter((tour) => tour.is_featured || tour.is_popular || tour.show_on_landing);
    return (preferred.length ? preferred : tours).slice(0, 12);
  }, [tours]);

  const tourItems = featuredTours.map((tour, index) => (
    <TourCard key={String(tour.id ?? index)} tour={tour} />
  ));

  const destinationRows = useMemo(() => destinationListingRows(countries), [countries]);

  const destinationItems = destinationRows.map((country, index) => {
    const slug =
      publicCountrySlug(country) ||
      canonicalCountrySlug(publicCountryLabel(country as RecordRow)) ||
      '';
    return (
      <Link key={slug || String(country.id ?? index)} href={destinationPublicPath(slug)} className="group block h-full">
        <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-sm">
          {countryHeroImage(slug, country as RecordRow) ? (
            <ResponsiveImage
              src={countryHeroImage(slug, country as RecordRow)}
              alt=""
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141612]/80 via-[#141612]/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h4 className="mb-1 font-serif text-2xl font-bold text-white">
              {publicCountryLabel(country as RecordRow, slug)}
            </h4>
            <p className="text-xs font-semibold uppercase tracking-widest text-sage">
              {pickString(country, ['tagline', 'subtitle'])}
            </p>
          </div>
        </div>
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-[#666]">
          {stripPublicMoney(
            pickPlainText(country, ['tagline', 'description_title', 'excerpt', 'description']) ||
              recordCardBlurb(country as RecordRow)
          )}
        </p>
        <span className="text-xs font-semibold uppercase tracking-widest text-moss group-hover:text-[#4a6b3a]">
          Popular Tour
        </span>
      </Link>
    );
  });

  const featuredParks = useMemo(() => parks.slice(0, 12), [parks]);

  const parkItems = featuredParks.map((park, index) => (
    <PlaceCard
      key={String(park.id ?? index)}
      href={`/parks/${publicRecordSlug(park)}`}
      image={getRecordImage(park) || undefined}
      title={getRecordTitle(park)}
      location={pickString(park, ['location', 'country'])}
      description={recordCardBlurb(park)}
      cta="View Park"
    />
  ));

  return (
    <PublicShell>
      {current && (
        <section className="relative h-[500px] overflow-hidden bg-[#141612] md:h-[600px]">
          {current.image ? (
            <ResponsiveImage
              key={current.image}
              src={current.image}
              alt=""
              variant="hero"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
          <button
            type="button"
            onClick={() => goHero(slide - 1)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white hover:bg-black/45"
            aria-label="Previous hero slide"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => goHero(slide + 1)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white hover:bg-black/45"
            aria-label="Next hero slide"
          >
            <ChevronRight />
          </button>
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl rounded-[3rem] border border-white/15 bg-black/30 px-8 py-6 text-center shadow-2xl backdrop-blur-md md:px-12 md:py-8">
              <h1
                className="mb-2 font-serif text-2xl font-bold leading-tight text-white md:text-4xl"
                style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.9)' }}
              >
                {current.title}
              </h1>
              <p
                className="mb-4 text-sm leading-snug text-white/90 md:text-base"
                style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}
              >
                {current.subtitle}
              </p>
              <Link
                href={current.href}
                className="pointer-events-auto inline-block rounded-full bg-moss/90 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm hover:bg-moss"
              >
                {current.cta}
              </Link>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goHero(index)}
                className={`relative z-20 h-2 w-2 rounded-full ${index === slide ? 'bg-white' : 'bg-white/40'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      <TourSearchBar tours={tours} categories={categories} destinations={destinationOptions} />

      <HomeBrandAndFeatures />

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Popular Tours" title="Explore Our Most Popular Tours" />
          <div className="mt-10">
            <Carousel instant items={tourItems} itemsPerView={{ sm: 1, md: 2, lg: 4 }} emptyMessage="No records found in this collection." />
          </div>
        </div>
      </section>

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Find tours by" title="Destination" />
          <div className="mt-10">
            <Carousel instant items={destinationItems} itemsPerView={{ sm: 1, md: 2, lg: 3 }} emptyMessage="No records found in this collection." />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2 rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a]"
            >
              Other Destinations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Wildlife" title="National Parks" />
          <div className="mt-10">
            <Carousel instant items={parkItems} itemsPerView={{ sm: 1, md: 2, lg: 4 }} emptyMessage="No records found in this collection." />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/parks"
              className="inline-flex items-center gap-2 rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a]"
            >
              Other Parks
            </Link>
          </div>
        </div>
      </section>

      <section className="cv-auto py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading label="Stay up to date with" title="Safari Updates" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {updates.slice(0, 4).map((post, index) => (
              <Link
                key={String(post.id ?? index)}
                href={`/safari-updates/${pickString(post, ['slug']) || post.id}`}
                className="group block overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                {getRecordImage(post) ? (
                  <ResponsiveImage
                    src={getRecordImage(post) || ''}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gray-100 text-sm text-gray-400">
                    No image
                  </div>
                )}
                <div className="p-4">
                  {recordPublishedAt(post) ? (
                    <p className="text-xs text-gray-400">{formatPublishedDate(recordPublishedAt(post))}</p>
                  ) : null}
                  <h4 className="mt-1 font-serif text-lg font-bold text-[#333]">{getRecordTitle(post)}</h4>
                  <p className="mt-2 line-clamp-2 text-sm text-[#666]">
                    {stripPublicMoney(pickPlainText(post, ['excerpt', 'description', 'content']))}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {updates.length === 0 && (
            <p className="mt-6 text-center text-gray-500">No records found in this collection.</p>
          )}
          <div className="mt-8 text-center">
            <Link
              href="/safari-updates"
              className="inline-flex items-center gap-2 border-2 border-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
            >
              More Updates
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8">
        <PageFaqList faqs={bestFaqsFor('home')} tone="light" />
      </section>

      <TestimonialsSection />
      <PaymentsSection />
    </PublicShell>
  );
}
