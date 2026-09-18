'use client';

import { useEffect, useMemo, useState } from 'react';
import HomeLandingExperience from '@/components/public/HomeLandingExperience';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import type { HomePageContent } from '@/lib/home-page-content';
import {
  fetchCollectionPage,
  fetchCollectionRecords,
  fetchFeaturedTours,
  isLanguagePost,
  isPublishedRecord,
} from '@/lib/data';
import { mergePublicDestinations, publicDestinationNames } from '@/lib/public-destinations';
import type { RecordRow } from '@/lib/types';

type HomePageClientProps = {
  initialCountries: RecordRow[];
  initialTours: RecordRow[];
  initialUpdates: RecordRow[];
  initialCategories: RecordRow[];
  initialHomeContent?: HomePageContent | null;
};

export default function HomePageClient({
  initialCountries,
  initialTours,
  initialUpdates,
  initialCategories,
  initialHomeContent,
}: HomePageClientProps) {
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [updates, setUpdates] = useState<RecordRow[]>(initialUpdates);
  const [countries, setCountries] = useState<RecordRow[]>(initialCountries);
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const hasServerContent = initialCountries.length > 0 || initialTours.length > 0;

  useEffect(() => {
    setCountries(initialCountries);
    setTours(initialTours);
    setUpdates(initialUpdates);
    setCategories(initialCategories);
  }, [initialCountries, initialTours, initialUpdates, initialCategories]);

  useCmsPageReload(async () => {
    try {
      const rows = await fetchCollectionRecords('countries', [], { maxRows: 48 });
      setCountries(rows.filter(isPublishedRecord));
    } catch (error) {
      console.error('[Supabase] Failed to load countries:', error);
    }

    const [tourRows, updateRows, categoryRows] = await Promise.all([
      fetchFeaturedTours(12).catch(() => [] as RecordRow[]),
      fetchCollectionPage('safari_updates', [], { limit: 8, offset: 0 })
        .then((page) => page.rows)
        .catch(() => [] as RecordRow[]),
      fetchCollectionRecords('categories', [], { maxRows: 64 }).catch(() => [] as RecordRow[]),
    ]);
    setTours((current) => (tourRows.length ? tourRows.slice(0, 12) : current));
    setUpdates(updateRows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)).slice(0, 8));
    setCategories(categoryRows.filter(isPublishedRecord));
  }, hasServerContent);

  const destinationOptions = useMemo(
    () => publicDestinationNames(mergePublicDestinations(countries)),
    [countries]
  );

  return (
    <HomeLandingExperience
      tours={tours}
      updates={updates}
      countries={countries}
      categories={categories}
      destinationOptions={destinationOptions}
      initialHomeContent={initialHomeContent}
    />
  );
}
