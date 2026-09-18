'use client';

import { useEffect, useState } from 'react';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import Carousel from '@/components/public/Carousel';
import SafariCategoryCard from '@/components/public/SafariCategoryCard';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import Link from 'next/link';
import PageHero from '@/components/public/PageHero';
import CountrySectionHeading from '@/components/public/CountrySectionHeading';
import PlaceCard from '@/components/public/PlaceCard';
import { countryPlacePath } from '@/lib/cms-routes';
import {
  categoryMatchesCountry,
  countryCategoryPath,
  matchesCountry,
  publicCountryLabel,
  recordMatchesCountrySlug,
} from '@/lib/country-utils';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import { COUNTRY_SPECIALISTS_LINE, countryArticleHtml, countryHeroTitle, stripParkListFromCountryHtml } from '@/lib/country-landing-copy';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  resolvePublicTours,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PageFaqList from '@/components/public/PageFaqList';
import { countryHeroImage } from '@/lib/country-heroes';
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
  initialStays?: RecordRow[];
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
  initialStays = [],
}: CountryPageContentProps) {
  const [country, setCountry] = useState<RecordRow | null>(countryProp);
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [parks, setParks] = useState<RecordRow[]>(initialParks);
  const [places, setPlaces] = useState<RecordRow[]>(initialPlaces);
  const [stays, setStays] = useState<RecordRow[]>(initialStays);
  const [ready, setReady] = useState(true);
  const hasServerContent = Boolean(
    pickString(countryProp || {}, ['description', 'country_description', 'overview', 'summary', 'excerpt'])?.trim() ||
      initialTours.length > 0
  );

  useEffect(() => {
    setCountry(countryProp);
    setCategories(initialCategories);
    setTours(initialTours);
    setParks(initialParks);
    setPlaces(initialPlaces);
    setStays(initialStays);
  }, [countryProp, initialCategories, initialTours, initialParks, initialPlaces, initialStays]);

  useCmsPageReload(async () => {
    try {
      const [countryRows, allCategories, countryTours] = await Promise.all([
        fetchCollectionRecords('countries', [], { maxRows: 48 }),
        fetchCollectionRecords('categories', [], { maxRows: 64 }),
        resolvePublicTours({ country: publicCountryLabel(countryProp, slug) || slug, limit: 48 }),
      ]);
      const match = countryRows.find((row) => recordMatchesCountrySlug(row, slug)) || null;
      let nextCountry = countryProp;
      if (match) {
        const full =
          match.id != null
            ? (await fetchCollectionRecordById('countries', String(match.id))) || match
            : match;
        if (isPublishedRecord(full)) nextCountry = full;
      }
      setCountry(nextCountry);
      setCategories(
        allCategories.filter(isPublishedRecord).filter((category) => categoryMatchesCountry(category, slug))
      );
      if (countryTours.length) {
        const matched = countryTours.filter((tour) => matchesCountry(tour, slug));
        setTours(matched.length ? matched : countryTours);
      }
    } catch (error) {
      console.error('[Supabase] Failed to load country page data:', error);
    } finally {
      setReady(true);
    }
  }, hasServerContent, [slug]);

  const extras = parseCmsPageExtras(country, slug);
  const title = publicCountryLabel(country, slug);
  const headline = extras.hero_title || pickString(country || {}, ['tagline', 'headline']);
  const bannerTitle = heroTitle?.trim() || headline || countryHeroTitle(slug, title);
  const faqs = limitFaqs(extras.faqs, bestFaqsFor('country', { countrySlug: slug, countryName: title }));
  const visitTime = bestTimeToVisit(slug, title, extras.best_time_to_visit);
  const published = useEnsurePublishedAt('countries', country, extras.published_at);

  const countryHtml = stripParkListFromCountryHtml(
    toProseHtml(
      country
        ? visibleRecordHtml(country, ['description', 'content', 'about']) || countryArticleHtml(slug)
        : countryArticleHtml(slug)
    )
  );
  const descriptionHtml = countryHtml;
  const summaryHtml = toProseHtml(extras.excerpt) || toProseHtml(country ? visibleRecordHtml(country, ['summary']) : '');
  const summaryIsDistinct =
    Boolean(summaryHtml) &&
    summaryHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() !==
      descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const categoryItems = categories.map((category, index) => (
    <SafariCategoryCard
      key={String(category.id ?? index)}
      category={category}
      titleOnly
      href={countryCategoryPath(slug, category)}
    />
  ));

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
              <div className="public-prose" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            ) : null}
            {summaryIsDistinct ? (
              <div className="public-prose mt-8" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
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

      {parks.length > 0 ? (
        <section className="bg-[#f3f3f3] px-4 py-12">
          <div className="mx-auto max-w-[1200px]">
            <CountrySectionHeading>National Parks in {title}</CountrySectionHeading>
            <div className="mt-8">
              <Carousel
                items={parks.map((park, index) => {
                  const parkSlug = publicRecordSlug(park);
                  return (
                    <PlaceCard
                      key={String(park.id ?? index)}
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
                href="/parks"
                className="inline-flex rounded-full border-2 border-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
              >
                Other Parks
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {stays.length > 0 ? (
        <section className="bg-[#f3f3f3] px-4 py-12">
          <div className="mx-auto max-w-[1200px]">
            <CountrySectionHeading>Accommodations in {title}</CountrySectionHeading>
            <div className="mt-8">
              <Carousel
                items={stays.map((stay, index) => {
                  const staySlug = publicRecordSlug(stay);
                  return (
                    <PlaceCard
                      key={String(stay.id ?? index)}
                      href={staySlug ? `/accommodations/${staySlug}` : '/accommodations'}
                      image={getRecordImage(stay) || undefined}
                      title={getRecordTitle(stay)}
                      location={pickString(stay, ['location', 'national_park_name', 'country'])}
                      description={recordCardBlurb(stay)}
                      record={stay}
                      cta="View Stay"
                    />
                  );
                })}
                itemsPerView={{ sm: 1, md: 2, lg: 4 }}
                instant
                autoPlayMs={5200}
              />
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/accommodations"
                className="inline-flex rounded-full border-2 border-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-moss hover:bg-moss hover:text-white"
              >
                Other Accommodations
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {places.length > 0 ? (
        <section className="bg-white px-4 py-12">
          <div className="mx-auto max-w-[1200px]">
            <CountrySectionHeading>Explore {title}</CountrySectionHeading>
            <div className="mt-8">
              <Carousel
                items={places.map((place, index) => {
                  const placeSlug = publicRecordSlug(place);
                  const href = placeSlug ? countryPlacePath(slug, place) : '/explore';
                  return (
                    <PlaceCard
                      key={String(place.id ?? index)}
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
                href="/explore"
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
