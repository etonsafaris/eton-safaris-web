'use client';

import { useEffect, useMemo, useState } from 'react';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import SpeakToExpertCard from '@/components/public/SpeakToExpertCard';
import PageFaqList from '@/components/public/PageFaqList';
import PageHero from '@/components/public/PageHero';
import {
  categoryMatchesCountry,
  countryLabelFromSlug,
  filterToursByCategory,
  findCategoryBySlug,
  matchesCountry,
} from '@/lib/country-utils';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  visibleRecordHtml,
} from '@/lib/data';
import { publicBodyHtml } from '@/lib/embedded-content';
import { parseCmsPageExtras } from '@/lib/cms-page-model';
import { countryHeroImage } from '@/lib/country-heroes';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

type CategoryPageContentProps = {
  slug: string;
  country: RecordRow | null;
  categorySlug: string;
  initialCategories?: RecordRow[];
  initialTours?: RecordRow[];
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

export default function CategoryPageContent({
  slug,
  country,
  categorySlug,
  initialCategories = [],
  initialTours = [],
}: CategoryPageContentProps) {
  const live = useCmsLive();
  const [categories, setCategories] = useState<RecordRow[]>(initialCategories);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    setCategories(initialCategories);
    setTours(initialTours);
  }, [initialCategories, initialTours]);

  useEffect(() => {
    if (live === 0) return undefined;
    let mounted = true;
    async function load() {
      try {
        const [allCategories, allTours] = await Promise.all([
          fetchCollectionRecords('categories'),
          fetchCollectionRecords('tours'),
        ]);
        if (!mounted) return;
        setCategories(
          allCategories.filter(isPublishedRecord).filter((category) => categoryMatchesCountry(category, slug))
        );
        setTours(allTours.filter(isPublishedRecord).filter((tour) => matchesCountry(tour, slug)));
      } catch (error) {
        console.error('[Supabase] Failed to load category page data:', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [slug, live]);

  const selectedCategory = useMemo(
    () => findCategoryBySlug(categories, categorySlug),
    [categories, categorySlug]
  );

  const categoryTitle = selectedCategory
    ? getRecordTitle(selectedCategory)
    : titleFromSlug(categorySlug) || 'Safari Category';
  const countryTitle = country ? getRecordTitle(country) : countryLabelFromSlug(slug);
  const heroImage =
    (selectedCategory && getRecordImage(selectedCategory)) || countryHeroImage(slug, country);
  const descriptionHtml = toProseHtml(
    selectedCategory ? visibleRecordHtml(selectedCategory, ['description', 'content', 'about', 'summary']) : ''
  );
  const faqs = parseCmsPageExtras(selectedCategory, categorySlug).faqs;

  const filteredTours = useMemo(
    () => (ready ? filterToursByCategory(tours, selectedCategory, categorySlug) : []),
    [ready, tours, selectedCategory, categorySlug]
  );

  const faqJsonLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }
    : null;

  return (
    <>
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
      <PageHero title={categoryTitle} image={heroImage} variant="country" />

      <section className="bg-white px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            {descriptionHtml ? (
              <div className="public-prose" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            ) : ready ? (
              <p className="text-[#222]">
                Discover {categoryTitle.toLowerCase()} tour packages in {countryTitle}.
              </p>
            ) : null}
            <PageFaqList faqs={faqs} tone="light" className="mt-10" />
          </div>
          <div className="md:col-span-1">
            <div className="md:sticky md:top-24">
              <SpeakToExpertCard variant="country" countryName={categoryTitle} />
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
