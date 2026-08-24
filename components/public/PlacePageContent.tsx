'use client';

import { useEffect, useState } from 'react';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import PageHero from '@/components/public/PageHero';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import RelatedSidebar from '@/components/public/RelatedSidebar';
import { countryPlacePath, explorePlacePath } from '@/lib/cms-routes';
import { countryLabelFromSlug, findPlaceBySlug, matchesCountry } from '@/lib/country-utils';
import { bestTimeForCountryLabel } from '@/lib/country-planning';
import { countryHeroImage } from '@/lib/country-heroes';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickStoredString,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { publicBodyHtml } from '@/lib/embedded-content';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

type PlacePageContentProps = {
  placeSlug: string;
  slug?: string;
  country?: RecordRow | null;
  place?: RecordRow | null;
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

export default function PlacePageContent({
  placeSlug,
  slug: countrySlugProp = '',
  country = null,
  place: initialPlace = null,
}: PlacePageContentProps) {
  const live = useCmsLive();
  const [place, setPlace] = useState<RecordRow | null>(initialPlace);
  const [others, setOthers] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [ready, setReady] = useState(Boolean(initialPlace));

  useEffect(() => {
    if (live === 0 && initialPlace) {
      setPlace(initialPlace);
      setReady(true);
      return undefined;
    }
    let mounted = true;
    async function load() {
      try {
        const [allPlaces, allTours] = await Promise.all([
          fetchCollectionRecords('explore'),
          fetchCollectionRecords('tours'),
        ]);
        if (!mounted) return;
        const publishedPlaces = allPlaces.filter(isPublishedRecord);
        const match =
          initialPlace ||
          findPlaceBySlug(publishedPlaces, placeSlug, countrySlugProp) ||
          findPlaceBySlug(allPlaces, placeSlug, countrySlugProp);
        setPlace(match);
        const countryKey =
          countrySlugProp ||
          pickStoredString(match, ['country', 'country_slug', 'destination', 'nation']);
        const otherPlaces = publishedPlaces.filter((row) => row !== match && String(row.id) !== String(match?.id || ''));
        const countryPlaces = countryKey
          ? otherPlaces.filter((row) => matchesCountry(row, countryKey))
          : [];
        setOthers((countryPlaces.length ? countryPlaces : otherPlaces).slice(0, 20));
        setTours(
          allTours
            .filter(isPublishedRecord)
            .filter((tour) => (countryKey ? matchesCountry(tour, countryKey) : false))
        );
      } catch (error) {
        console.error('[Supabase] Failed to load place page data:', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [placeSlug, countrySlugProp, initialPlace, live]);

  const placeTitle = place ? getRecordTitle(place) : placeSlug.replace(/-/g, ' ');
  const countryTitle =
    (country && getRecordTitle(country)) ||
    (countrySlugProp ? countryLabelFromSlug(countrySlugProp.replace(/-safaris$/, '')) : '') ||
    pickStoredString(place, ['country']) ||
    'this destination';
  const heroImage = (place && getRecordImage(place)) || countryHeroImage(countrySlugProp, country);
  const descriptionTitle = place ? pickStoredString(place, ['description_title']) : '';
  const descriptionHtml = toProseHtml(
    place ? visibleRecordHtml(place, ['description', 'content', 'summary', 'about']) : ''
  );
  const metaCountry =
    pickStoredString(place, ['country']) ||
    (countryTitle !== 'this destination' ? countryTitle : '');
  const metaLocation = place ? pickStoredString(place, ['location']) : '';
  const metaPublished = place ? recordPublishedAt(place) : undefined;

  return (
    <>
      <PageHero
        title={placeTitle}
        image={heroImage}
        variant="park"
        location={metaLocation || undefined}
        country={metaCountry || undefined}
        published={metaPublished}
      />

      <section className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            {descriptionTitle ? <h2 className="content-subheading">{descriptionTitle}</h2> : null}
            {descriptionHtml ? (
              <div className="public-prose" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            ) : ready && !place ? (
              <p className="text-[#222]">This place could not be found.</p>
            ) : !descriptionHtml && ready ? (
              <p className="text-[#222]">
                Discover {placeTitle} and safari experiences in {countryTitle}.
              </p>
            ) : null}
            {place ? <ContentBlocks record={place} /> : null}
          </div>
          <div className="md:col-span-1">
            <div className="md:sticky md:top-24">
              <RelatedSidebar
                title="Other Places"
                countryName={countryTitle}
                items={others.map((row) => ({
                  href: countrySlugProp ? countryPlacePath(countrySlugProp, row) : explorePlacePath(row),
                  image: getRecordImage(row),
                  title: getRecordTitle(row),
                  date: formatPublishedDate(recordPublishedAt(row)),
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="tour-packages" className="bg-[#f3f6f5]">
        <AmazingSafaris
          tours={tours}
          title={`Explore These Amazing Safaris in ${countryTitle}`}
          emptyMessage={ready ? 'No tour package found. Try another search.' : undefined}
        />
      </section>
    </>
  );
}
