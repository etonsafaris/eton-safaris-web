'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import TourCard from '@/components/public/TourCard';
import TourSearchBar from '@/components/public/TourSearchBar';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageFaqList from '@/components/public/PageFaqList';
import { SITE } from '@/lib/collections';
import { mergePublicDestinations, publicDestinationNames } from '@/lib/public-destinations';
import { useCmsLive } from '@/lib/cms-live';
import { fetchCollectionPage, getRecordImage, getRecordTitle, isPublishedRecord, publicRecordSlug, searchTours, TOUR_LIST_COLUMNS } from '@/lib/data';
import { searchPublishedTours } from '@/lib/tour-search';
import { bestFaqsFor } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

function ToursList({
  initialTours,
  initialCategories,
  initialCountries,
  initialTotal = 0,
}: {
  initialTours: RecordRow[];
  initialCategories: RecordRow[];
  initialCountries: RecordRow[];
  initialTotal?: number;
}) {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') || '';
  const category = searchParams?.get('category') || '';
  const destination = searchParams?.get('destination') || '';
  const days = searchParams?.get('days') || '';
  const depart = searchParams?.get('depart') || '';
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);
  const live = useCmsLive();

  useEffect(() => {
    setTours(initialTours);
    setCategories(initialCategories);
    setCountries(initialCountries);
  }, [initialTours, initialCategories, initialCountries]);

  useEffect(() => {
    const filteredSearch = Boolean(q || (destination && destination !== 'All destinations') || category);
    if (!filteredSearch) return undefined;
    let cancelled = false;
    void searchTours({
      query: q,
      country: destination,
      category,
      limit: 48,
    }).then((rows) => {
      if (!cancelled) setTours(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [q, destination, category]);

  useEffect(() => {
    if (initialTours.length > 0) return undefined;
    let cancelled = false;
    Promise.all([
      fetchCollectionPage('tours', [], { columns: TOUR_LIST_COLUMNS, limit: 48, offset: 0 }).then((page) =>
        page.rows.filter(isPublishedRecord)
      ),
      fetchCollectionPage('categories', [], { limit: 80, offset: 0 }).then((page) => page.rows).catch(() => []),
      fetchCollectionPage('countries', [], { limit: 40, offset: 0 }).then((page) => page.rows).catch(() => []),
    ])
      .then(([tourRows, categoryRows, countryRows]) => {
        if (cancelled) return;
        setTours(tourRows);
        setCategories(categoryRows);
        setCountries(countryRows.filter(isPublishedRecord));
      })
      .catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [live, initialTours.length]);

  const destinationOptions = useMemo(() => publicDestinationNames(mergePublicDestinations(countries)), [countries]);

  const filtered = useMemo(
    () => searchPublishedTours(tours, q, destination, category, days),
    [tours, q, destination, category, days]
  );

  return (
    <PublicShell>
      <PageHero
        title="Tours"
        subtitle={
          q || destination || category || days
            ? `${filtered.length.toLocaleString()} package${filtered.length === 1 ? '' : 's'}${q ? ` for “${q}”` : ''}${destination ? ` in ${destination}` : ''}${category ? ` · ${category}` : ''}${days ? ` · ${days} days` : ''}${depart ? ` · departing ${depart}` : ''}`
            : `${(initialTotal || filtered.length).toLocaleString()} Total Packages from the live database.`
        }
        image={filtered[0] ? getRecordImage(filtered[0]) : undefined}
      />
      <div className="bg-[#f3f3f3] pb-4 pt-2">
        <TourSearchBar
          tours={tours}
          categories={categories}
          destinations={destinationOptions}
          initialQuery={q}
          initialDestination={destination || 'All destinations'}
          initialCategory={category}
          className="-mt-10 px-4"
        />
      </div>
      <ListingSection className="pt-6">
        <Link href="/tours/compare" className="inline-flex text-sm font-semibold text-[#00A651] hover:underline">
          Compare packages →
        </Link>
        {filtered.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: `${SITE.name} safari tour packages`,
                numberOfItems: filtered.length,
                itemListElement: filtered.slice(0, 30).map((tour, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: getRecordTitle(tour),
                  url: `${SITE.url}/tours/${publicRecordSlug(tour)}`,
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />
        ) : null}
        {filtered.length === 0 ? (
          <p className="mt-16 text-center text-gray-500">No tour package found. Try another search.</p>
        ) : (
          <div className="mt-8">
            <ListingGrid>
              {filtered.map((tour, index) => (
                <TourCard key={String(tour.id ?? index)} tour={tour} />
              ))}
            </ListingGrid>
          </div>
        )}
      </ListingSection>
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('tours')} tone="light" />
      </div>
    </PublicShell>
  );
}

export default function ToursPageClient(props: {
  initialTours: RecordRow[];
  initialCategories: RecordRow[];
  initialCountries: RecordRow[];
  initialTotal?: number;
}) {
  return (
    <Suspense>
      <ToursList {...props} />
    </Suspense>
  );
}
