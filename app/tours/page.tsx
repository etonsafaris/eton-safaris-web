'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PublicShell from '@/components/public/PublicShell';
import PageHero from '@/components/public/PageHero';
import TourCard from '@/components/public/TourCard';
import TourSearchBar from '@/components/public/TourSearchBar';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import { NAV_COUNTRIES } from '@/lib/collections';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord } from '@/lib/data';
import { searchPublishedTours } from '@/lib/tour-search';
import type { RecordRow } from '@/lib/types';

function ToursList() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') || '';
  const category = searchParams?.get('category') || '';
  const destination = searchParams?.get('destination') || '';
  const days = searchParams?.get('days') || '';
  const depart = searchParams?.get('depart') || '';
  const [tours, setTours] = useState<RecordRow[]>([]);
  const [categories, setCategories] = useState<RecordRow[]>([]);
  const [countries, setCountries] = useState<RecordRow[]>([]);

  useEffect(() => {
    Promise.all([
      fetchCollectionRecords('tours').then((rows) => rows.filter(isPublishedRecord)),
      fetchCollectionRecords('categories').catch(() => []),
      fetchCollectionRecords('countries').catch(() => []),
    ])
      .then(([tourRows, categoryRows, countryRows]) => {
        setTours(tourRows);
        setCategories(categoryRows);
        setCountries(countryRows.filter(isPublishedRecord));
      })
      .catch((error) => console.error(error));
  }, []);

  const destinationOptions = useMemo(() => {
    if (countries.length > 0) return countries.map((country) => getRecordTitle(country));
    return NAV_COUNTRIES.map((country) => country.name);
  }, [countries]);

  const filtered = useMemo(
    () => searchPublishedTours(tours, q, destination, category, days),
    [tours, q, destination, category, days]
  );

  return (
    <PublicShell>
      <PageHero
        title="Tours"
        subtitle={
          q || destination || category
            ? `Search results${q ? ` for “${q}”` : ''}${destination ? ` in ${destination}` : ''}${category ? ` · ${category}` : ''}${days ? ` · ${days} days` : ''}${depart ? ` · departing ${depart}` : ''}`
            : 'All safari packages from the live database.'
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
    </PublicShell>
  );
}

export default function ToursPage() {
  return (
    <Suspense>
      <ToursList />
    </Suspense>
  );
}
