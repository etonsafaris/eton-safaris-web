'use client';

import { useMemo } from 'react';
import Carousel from '@/components/public/Carousel';
import SafariCategoryCard from '@/components/public/SafariCategoryCard';
import SectionHeading from '@/components/public/SectionHeading';
import { getRecordTitle } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

type HomeCategoriesSectionProps = {
  categories?: RecordRow[] | null;
};

export default function HomeCategoriesSection({ categories }: HomeCategoriesSectionProps) {
  const categoryItems = useMemo(() => {
    try {
      return (categories ?? [])?.map((category, index) => {
        if (!category) return null;
        const title = getRecordTitle(category) || '';
        const href = title ? `/tours?category=${encodeURIComponent(title)}` : '/tours';
        return (
          <SafariCategoryCard
            key={String(category?.id ?? category?.slug ?? index)}
            category={category}
            titleOnly
            href={href}
          />
        );
      })?.filter(Boolean) ?? [];
    } catch (error) {
      console.warn('[Public] Home categories carousel failed:', error);
      return [];
    }
  }, [categories]);

  if (!categoryItems?.length) return null;

  return (
    <section className="cv-auto bg-[#f8f8f8] py-16">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading label="Safari activities" title="Browse by Category" />
        <div className="mt-10">
          <Carousel
            instant
            items={categoryItems}
            itemsPerView={{ sm: 2, md: 3, lg: 5 }}
            emptyMessage="No records found in this collection."
          />
        </div>
      </div>
    </section>
  );
}
