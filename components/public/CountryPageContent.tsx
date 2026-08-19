'use client';

import { useEffect, useState } from 'react';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import Carousel from '@/components/public/Carousel';
import PlaceCard from '@/components/public/PlaceCard';
import SafariCategoryCard from '@/components/public/SafariCategoryCard';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import PageHero from '@/components/public/PageHero';
import { countryPlacePath } from '@/lib/cms-routes';
import {
  categoryMatchesCountry,
  countryCategoryPath,
  countryLabelFromSlug,
  matchesCountry,
} from '@/lib/country-utils';
import {
  COUNTRY_SPECIALISTS_LINE,
  countryArticleHtml,
  countryHeroTitle,
  isSubstantialCountryArticle,
} from '@/lib/country-landing-copy';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickString,
  visibleRecordHtml,
} from '@/lib/data';
import { publicBodyHtml } from '@/lib/embedded-content';
import PageFaqList from '@/components/public/PageFaqList';
import type { RecordRow } from '@/lib/types';

type CountryPageContentProps = {
  slug: string;
  country: RecordRow | null;
  heroTitle?: string;
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
  country,
  heroTitle,
}: CountryPageContentProps) {
  const [categories, setCategories] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [parks, setParks] = useState<RecordRow[]>([]);
  const [places, setPlaces] = useState<RecordRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [allCategories, allTours, allParks, allPlaces] = await Promise.all([
          fetchCollectionRecords('categories'),
          fetchCollectionRecords('tours'),
          fetchCollectionRecords('national_park', ['national_parks', 'parks']),
          fetchCollectionRecords('explore'),
        ]);
        setCategories(
          allCategories.filter(isPublishedRecord).filter((category) => categoryMatchesCountry(category, slug))
        );
        setTours(allTours.filter(isPublishedRecord).filter((tour) => matchesCountry(tour, slug)));
        setParks(allParks.filter(isPublishedRecord).filter((park) => matchesCountry(park, slug)));
        setPlaces(allPlaces.filter(isPublishedRecord).filter((place) => matchesCountry(place, slug)));
      } catch (error) {
        console.error('[Supabase] Failed to load country page data:', error);
      } finally {
        setReady(true);
      }
    }
    load();
  }, [slug]);

  const extras = parseCmsPageExtras(country, slug);
  const title = country ? getRecordTitle(country) : countryLabelFromSlug(slug);
  const headline = extras.hero_title || pickString(country || {}, ['tagline', 'headline']);
  const bannerTitle = heroTitle?.trim() || headline || countryHeroTitle(slug, title);

  const countryHtml = toProseHtml(country ? visibleRecordHtml(country, ['description', 'content', 'about']) : '');
  const descriptionHtml =
    (isSubstantialCountryArticle(countryHtml) ? countryHtml : '') || countryHtml || countryArticleHtml(slug);
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
      <PageHero title={bannerTitle} image={getRecordImage(country || {})} variant="country" />

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
              itemsPerView={{ sm: 2, md: 3, lg: 4 }}
              autoPlayMs={0}
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
            <PageFaqList faqs={extras.faqs} tone="light" />
          </div>
          <div className="md:col-span-1">
            <div className="md:sticky md:top-24">
              <SpeakToExpertCard variant="country" countryName={title} />
            </div>
          </div>
        </div>
      </section>

      <section id="tour-packages" className="bg-[#f3f6f5]">
        <AmazingSafaris
          tours={tours}
          title={`Explore These Amazing Safaris in ${title}`}
          emptyMessage={ready ? 'No tour package found. Try another search.' : undefined}
        />
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <div className="dav-amazing-title">
            <h3>National Parks in {title}</h3>
            <span className="dav-amazing-underline" />
          </div>
          <div className="mt-10">
            <Carousel
              items={parks.map((park, index) => (
                <PlaceCard
                  key={String(park.id ?? index)}
                  href={`/parks/${pickString(park, ['slug']) || park.id}`}
                  image={getRecordImage(park) || undefined}
                  title={getRecordTitle(park)}
                  location={pickString(park, ['location', 'country'])}
                  description={pickPlainText(park, ['description', 'excerpt', 'content'])}
                  cta="View Park"
                />
              ))}
              itemsPerView={{ sm: 1, md: 2, lg: 4 }}
              emptyMessage="No records found in this collection."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f3f3f3] py-12">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <div className="dav-amazing-title">
            <h3>Places to Explore in {title}</h3>
            <span className="dav-amazing-underline" />
          </div>
          <div className="mt-10">
            <Carousel
              items={places.map((place, index) => (
                <PlaceCard
                  key={String(place.id ?? index)}
                  href={countryPlacePath(slug, place)}
                  image={getRecordImage(place) || undefined}
                  title={getRecordTitle(place)}
                  location={pickString(place, ['location', 'country'])}
                  description={pickPlainText(place, ['description', 'excerpt', 'content'])}
                  cta="Read More"
                />
              ))}
              itemsPerView={{ sm: 1, md: 2, lg: 4 }}
              emptyMessage="No records found in this collection."
            />
          </div>
        </div>
      </section>
    </>
  );
}
