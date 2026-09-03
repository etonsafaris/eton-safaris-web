'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PageFaqList from '@/components/public/PageFaqList';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionPage,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
} from '@/lib/data';
import { useCmsPageReload } from '@/lib/use-cms-page-reload';
import { bestFaqsFor } from '@/lib/best-faqs';
import type { RecordRow } from '@/lib/types';

export default function AccommodationsPageClient({
  initialRows,
  initialTotal = 0,
}: {
  initialRows: RecordRow[];
  initialTotal?: number;
}) {
  const [rows, setRows] = useState<RecordRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal || initialRows.length);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal || initialRows.length);
  }, [initialRows, initialTotal]);

  useCmsPageReload(() => {
    fetchCollectionPage('accommodations', [], { limit: 48, offset: 0 })
      .then((page) => {
        setRows(page.rows.filter(isPublishedRecord));
        setTotal(page.total);
      })
      .catch((error) => console.error(error));
  }, initialRows.length > 0);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchCollectionPage('accommodations', [], { limit: 48, offset: rows.length });
      setRows((current) => {
        const seen = new Set(current.map((row) => String(row.id || '')));
        return [...current, ...page.rows.filter(isPublishedRecord).filter((row) => !seen.has(String(row.id || '')))];
      });
      setTotal(page.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <PublicShell>
      <PageHero
        title="Accommodations"
        subtitle={`${total.toLocaleString()} lodges, camps, hotels, and bandas`}
        image={rows[0] ? getRecordImage(rows[0]) : undefined}
      />
      <ListingSection>
        {rows.length === 0 ? (
          <p className="text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            <ListingGrid>
              {rows.map((item, index) => (
                <PlaceCard
                  key={String(item.id ?? index)}
                  href={`/accommodations/${publicRecordSlug(item)}`}
                  image={getRecordImage(item) || undefined}
                  title={getRecordTitle(item)}
                  record={item}
                  location={pickString(item, ['type', 'location', 'country'])}
                  description={recordCardBlurb(item)}
                  cta="View Stay"
                />
              ))}
            </ListingGrid>
            {rows.length < total ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a] disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more stays (${rows.length} of ${total.toLocaleString()})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </ListingSection>
      <div className="mx-auto max-w-[1200px] px-4 pb-12">
        <PageFaqList faqs={bestFaqsFor('accommodations')} tone="light" />
      </div>
    </PublicShell>
  );
}
