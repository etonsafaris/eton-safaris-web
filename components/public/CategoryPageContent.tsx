'use client';

import { useEffect, useMemo, useState } from 'react';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import PageFaqList from '@/components/public/PageFaqList';
import PageHero from '@/components/public/PageHero';
import {
  categoryMatchesCountry,
  filterToursByCategory,
  findCategoryBySlug,
  matchesCountry,
  publicCountryLabel,
} from '@/lib/country-utils';
import {
  fetchCollectionRecords,
  resolvePublicTours,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickRecordId,
  pickString,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { countryHeroImage } from '@/lib/country-heroes';
import { categoryPageHtml } from '@/lib/category-copy';
import { bestFaqsFor, limitFaqs } from '@/lib/best-faqs';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

const EMPTY_ROWS: RecordRow[] = [];

type CategoryPageContentProps = {
  slug: string;
  country: RecordRow | null;
  categorySlug: string;
  initialCategories?: RecordRow[];
  initialTours?: RecordRow[];
  initialCategory?: RecordRow | null;
  serverPreloaded?: boolean;
  heroImage?: string;
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

function titleFromSlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function recordKey(record: RecordRow) {
  return String(record.id ?? record.slug ?? record.title ?? '');
}

function sameRecordList(current: RecordRow[], next: RecordRow[]) {
  if (current.length !== next.length) return false;
  return current.every((row, index) => recordKey(row) === recordKey(next[index]));
}

export default function CategoryPageContent({
  slug,
  country,
  categorySlug,
  initialCategories = EMPTY_ROWS,
  initialTours = EMPTY_ROWS,
  initialCategory = null,
  serverPreloaded = false,
  heroImage: savedHeroImage = '',
}: CategoryPageContentProps) {
  const live = useCmsLive();
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [ready, setReady] = useState(
    serverPreloaded || Boolean(initialCategory || initialCategories.length || initialTours.length)
  );

  useEffect(() => {
    setCategories(initialCategories);
    setTours(initialTours);
  }, [initialCategories, initialTours]);

  useEffect(() => {
    if (serverPreloaded && live === 0) return undefined;
    let mounted = true;
    async function load() {
      try {
        const [allCategories, countryTours] = await Promise.all([
          fetchCollectionRecords('categories'),
          resolvePublicTours({ country: slug, limit: 48 }),
        ]);
        if (!mounted) return;
        const nextCategories = allCategories
          .filter(isPublishedRecord)
          .filter((category) => categoryMatchesCountry(category, slug));
        const matched = countryTours.filter((tour) => matchesCountry(tour, slug));
        const nextTours = matched.length ? matched : countryTours;
        setCategories((current) => (sameRecordList(current, nextCategories) ? current : nextCategories));
        if (nextTours.length) {
          setTours((current) => (sameRecordList(current, nextTours) ? current : nextTours));
        }
      } catch (error) {
        console.error('[Public] Failed to load category page data:', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [slug, live, serverPreloaded]);

  const selectedCategory = useMemo(
    () =>
      findCategoryBySlug(categories, categorySlug, slug) ||
      (initialCategory && categoryMatchesCountry(initialCategory, slug) ? initialCategory : null),
    [categories, categorySlug, slug, initialCategory]
  );

  const categoryTitle = selectedCategory
    ? getRecordTitle(selectedCategory)
    : titleFromSlug(categorySlug) || 'Safari Category';
  const countryTitle = publicCountryLabel(country, slug);
  const heroImage =
    (selectedCategory && getRecordImage(selectedCategory)) ||
    savedHeroImage ||
    countryHeroImage(slug, country);
  const descriptionHtml = toProseHtml(
    selectedCategory ? visibleRecordHtml(selectedCategory, ['description', 'content', 'about', 'summary']) : ''
  );
  const categoryBody =
    descriptionHtml && descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length >= 80
      ? descriptionHtml
      : selectedCategory
        ? categoryPageHtml(selectedCategory, countryTitle, slug)
        : '';
  const categoryExtras = parseCmsPageExtras(selectedCategory, categorySlug);
  const faqs = limitFaqs(
    categoryExtras.faqs,
    bestFaqsFor('category', { countrySlug: slug, countryName: countryTitle, categoryTitle })
  );
  const publishedFallback =
    categoryExtras.published_at || (country ? recordPublishedAt(country) : '');
  const published = useEnsurePublishedAt(
    'categories',
    selectedCategory,
    publishedFallback,
    (stamp) => {
      const id = pickRecordId(selectedCategory);
      if (id == null) return;
      setCategories((rows) =>
        rows.map((row) => (pickRecordId(row) === id ? { ...row, published_at: stamp } : row))
      );
    }
  );

  const filteredTours = useMemo(() => {
    if (serverPreloaded && initialTours.length) return initialTours;
    return ready ? filterToursByCategory(tours, selectedCategory, categorySlug) : [];
  }, [ready, tours, selectedCategory, categorySlug, serverPreloaded, initialTours]);

  return (
    <>
      <PageHero
        title={categoryTitle}
        image={heroImage}
        variant="country"
        country={countryTitle}
        published={published || undefined}
        metaItems={[
          { label: 'Country', value: countryTitle },
          { label: 'Published', value: published },
        ]}
      />

      <section className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            {categoryBody ? (
              <PublicHtml className="public-prose" html={categoryBody} />
            ) : ready ? (
              <p className="text-[#222]">
                Discover {categoryTitle.toLowerCase()} tour packages in {countryTitle}.
              </p>
            ) : null}
            <PageFaqList faqs={faqs} tone="light" className="mt-10" />
          </div>
          <div className="md:col-span-1">
            <div className="md:sticky md:top-24">
              <SpeakToExpertCard variant="country" countryName={countryTitle} />
            </div>
          </div>
        </div>
      </section>

      <section id="tour-packages" className="bg-[#f3f6f5]">
        <AmazingSafaris
          tours={filteredTours}
          kicker="Explore exciting tours in the"
          title={`${categoryTitle} category`}
          emptyMessage={ready ? 'No tour package found. Try another search.' : undefined}
        />
      </section>
    </>
  );
}
