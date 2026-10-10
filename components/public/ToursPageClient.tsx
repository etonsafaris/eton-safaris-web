'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageHero from '@/components/public/PageHero';
import TourCard from '@/components/public/TourCard';
import dynamic from 'next/dynamic';
const TourSearchBar = dynamic(() => import('@/components/public/TourSearchBar'), {
  loading: () => <div className="min-h-[52px] w-full rounded-md bg-gray-100" aria-hidden />,
});
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import ListingPager from '@/components/public/ListingPager';
import PageFaqList from '@/components/public/PageFaqList';
import { mergePublicDestinations, publicDestinationNames } from '@/lib/public-destinations';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import { fetchCollectionPage, getRecordImage, isPublishedRecord, searchTours, TOUR_LIST_COLUMNS } from '@/lib/data';
import { searchPublishedTours } from '@/lib/tour-search';
const DiscoverySearchSection = dynamic(() => import('@/components/public/DiscoverySearchSection'), {
  loading: () => null,
});
import { bestFaqsFor } from '@/lib/best-faqs';
import { deriveCategoriesFromTours } from '@/lib/derive-tour-categories';
import type { RecordRow } from '@/lib/types';

export default function ToursPageClient({
  initialTours,
  initialCategories,
  initialCountries,
  initialTotal = 0,
  page = 1,
  pageSize = 24,
  initialQuery = '',
  initialCategory = '',
  initialDestination = '',
  initialDays = '',
  initialDepart = '',
}: {
  initialTours: RecordRow[];
  initialCategories: RecordRow[];
  initialCountries: RecordRow[];
  initialTotal?: number;
  page?: number;
  pageSize?: number;
  initialQuery?: string;
  initialCategory?: string;
  initialDestination?: string;
  initialDays?: string;
  initialDepart?: string;
}) {
  const q = initialQuery;
  const category = initialCategory;
  const destination = initialDestination;
  const days = initialDays;
  const depart = initialDepart;
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);

  useEffect(() => {
    setTours(initialTours);
    setCategories(initialCategories);
    setCountries(initialCountries);
  }, [initialTours, initialCategories, initialCountries]);

  useCmsPageReload(() => {
    const pageOffset = (page - 1) * pageSize;
    return Promise.all([
      fetchCollectionPage('tours', [], { columns: TOUR_LIST_COLUMNS, limit: pageSize, offset: pageOffset }).then(
        (result) => result.rows.filter(isPublishedRecord)
      ),
      fetchCollectionPage('categories', [], { limit: 80, offset: 0 }).then((result) => result.rows).catch(() => []),
      fetchCollectionPage('countries', [], { limit: 40, offset: 0 }).then((result) => result.rows).catch(() => []),
    ])
      .then(([tourRows, categoryRows, countryRows]) => {
        if (tourRows.length) setTours(tourRows);
        if (categoryRows.length) setCategories(categoryRows);
        if (countryRows.length) setCountries(countryRows.filter(isPublishedRecord));
      })
      .catch((error) => console.error(error));
  }, initialTours.length > 0);

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

  const destinationOptions = useMemo(() => publicDestinationNames(mergePublicDestinations(countries)), [countries]);

  const activityCategories = useMemo(
    () => deriveCategoriesFromTours(categories, tours),
    [categories, tours]
  );

  const filtered = useMemo(
    () => searchPublishedTours(tours, q, destination, category, days),
    [tours, q, destination, category, days]
  );

  return (
    <>
      <PageHero
        title="Tours"
        subtitle={
          q || destination || category || days
            ? `${filtered.length.toLocaleString()} package${filtered.length === 1 ? '' : 's'}${q ? ` for “${q}”` : ''}${destination ? ` in ${destination}` : ''}${category ? ` · ${category}` : ''}${days ? ` · ${days} days` : ''}${depart ? ` · departing ${depart}` : ''}`
            : `${(initialTotal || tours.length || filtered.length).toLocaleString()} safari packages available`
        }
        image={filtered[0] ? getRecordImage(filtered[0]) : undefined}
      />
      <div className="bg-[#f3f3f3] pb-4 pt-2">
        <TourSearchBar
          tours={tours}
          categories={activityCategories}
          destinations={destinationOptions}
          initialQuery={q}
          initialDestination={destination || 'All destinations'}
          initialCategory={category}
          className="-mt-10 px-4"
        />
      </div>
      {q.trim().length >= 2 ? <DiscoverySearchSection query={q} /> : null}
      <ListingSection className="pt-6">
        <Link href="/tours/compare" className="inline-flex text-sm font-semibold text-[#00A651] hover:underline">
          Compare packages →
        </Link>
        {(filtered?.length ?? 0) === 0 ? (
          <p className="mt-16 text-center text-gray-500">No tour package found. Try another search.</p>
        ) : (
          <div className="mt-8">
            <ListingGrid>
              {(filtered ?? [])?.map((tour, index) => (
                <TourCard key={String(tour.id ?? index)} tour={tour} showPublishedDate={false} />
              ))}
            </ListingGrid>
          </div>
        )}
        {!q && !category && !(destination && destination !== 'All destinations') && !days ? (
          <ListingPager basePath="/tours" page={page} pageSize={pageSize} total={initialTotal || tours.length} label="tours" />
        ) : null}
      </ListingSection>
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('tours')} tone="light" />
      </div>
    </>
  );
}
