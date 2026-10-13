'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import DetailPageShell from '@/components/public/DetailPageShell';
import { triggerNotFound } from '@/lib/client-not-found';
import { useServerRecordGate } from '@/lib/use-server-record-gate';
import {
  fetchCollectionPage,
  fetchRecordByPublicSlug,
  resolvePublicTours,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickStoredString,
  pickString,
  publicRecordSlug,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { useCmsLive } from '@/lib/cms-live';
import { accommodationNationalParkDisplay } from '@/lib/accommodation-park';
import type { RecordRow } from '@/lib/types';

export default function AccommodationDetailClient({
  embedded = false,
  initialItem = null,
  initialOthers = [],
  initialTours = [],
}: {
  embedded?: boolean;
  initialItem?: RecordRow | null;
  initialOthers?: RecordRow[];
  initialTours?: RecordRow[];
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';
  const [item, setItem] = useState<RecordRow | null>(initialItem);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const [others, setOthers] = useState<RecordRow[]>(initialOthers);
  const live = useCmsLive();
  const serverGate = useServerRecordGate(initialItem);

  useEffect(() => {
    setItem(initialItem);
    setTours(initialTours);
    if (initialOthers.length) setOthers(initialOthers);
  }, [initialItem, initialOthers, initialTours]);

  useEffect(() => {
    if (serverGate.current && live === 0) return;
    async function load() {
      try {
        const full = await fetchRecordByPublicSlug('accommodations', slug);
        const published = full && isPublishedRecord(full) ? full : null;
        if (!published) {
          if (!serverGate.current) triggerNotFound();
          return;
        }
        const country = published ? pickStoredString(published, ['country']) : '';
        const tourRows = await resolvePublicTours({
          country,
          limit: 12,
          excludeId: published.id != null ? String(published.id) : undefined,
        });
        setItem(published);
        if (tourRows.length) setTours(tourRows);
      } catch (error) {
        console.error('[Accommodation detail] Failed to load stay:', error);
        if (!serverGate.current) {
          setItem(null);
          setTours([]);
          triggerNotFound();
        }
      }
    }
    void load();
  }, [slug, live, router, serverGate]);

  useEffect(() => {
    if (others.length) return;
    const country = item ? pickStoredString(item, ['country']) : '';
    let cancelled = false;
    const currentId = String(item?.id || '');
    const currentSlug = item ? publicRecordSlug(item) : slug;
    const keep = (rows: RecordRow[]) =>
      rows
        .filter((row) => isPublishedRecord(row))
        .filter((row) => {
          const id = String(row.id || '');
          const staySlug = publicRecordSlug(row);
          if (currentId && id === currentId) return false;
          if (currentSlug && staySlug === currentSlug) return false;
          return Boolean(staySlug);
        })
        .slice(0, 8);
    fetchCollectionPage('accommodations', [], {
      limit: 12,
      filters: country ? { country } : undefined,
    })
      .then(async (page) => {
        if (cancelled) return;
        let rows = keep(page.rows || []);
        if (!rows.length && country) {
          const broader = await fetchCollectionPage('accommodations', [], { limit: 12 });
          if (!cancelled) rows = keep(broader.rows || []);
        }
        if (rows.length) setOthers(rows);
      })
      .catch((error) => console.error('[Accommodation detail] Other stays failed:', error));
    return () => {
      cancelled = true;
    };
  }, [item, others.length, slug]);

  const otherCards = others.map((row) => ({
    href: `/accommodations/${publicRecordSlug(row)}`,
    image: getRecordImage(row),
    title: getRecordTitle(row),
  }));

  const nationalParkLabel = accommodationNationalParkDisplay(item);

  const published = useEnsurePublishedAt('accommodations', item, '', (stamp) => {
    setItem((row) => (row ? { ...row, published_at: stamp } : row));
  });

  if (!item) {
    return (
      <DetailPageShell embedded={embedded}>
        <p className="px-4 py-20 text-center text-gray-500">No records found in this collection.</p>
      </DetailPageShell>
    );
  }

  return (
    <DetailPageShell embedded={embedded}>
      <PageHero
        variant="park"
        title={getRecordTitle(item)}
        location={pickString(item, ['location']) || undefined}
        country={pickString(item, ['country']) || undefined}
        published={published || undefined}
        image={getRecordImage(item)}
        metaItems={[
          {
            label: 'National Park',
            value:
              nationalParkLabel ||
              pickStoredString(item, ['national_park_name', 'national_park', 'park', 'park_name']),
          },
          { label: 'Type', value: pickStoredString(item, ['type']) },
        ]}
      />
      <ContentDetailLayout
        hideMeta
        country={pickString(item, ['country'])}
        sidebarTitle="Other Accommodations"
        sidebarItems={otherCards}
        sidebarAlways
        below={
          <AmazingSafaris
            tours={tours}
            title={
              pickStoredString(item, ['country'])
                ? `Explore These Amazing Safaris in ${pickStoredString(item, ['country'])}`
                : 'Explore Our Amazing Safaris'
            }
            emptyMessage="Tour packages for this destination will appear here."
          />
        }
      >
        {pickStoredString(item, ['description_title']) && (
          <h2 className="content-subheading">
            {pickStoredString(item, ['description_title'])}
          </h2>
        )}
        <PublicHtml
          className="public-prose max-w-none"
          html={publicBodyHtml(visibleRecordHtml(item, ['description']))}
        />
        <ContentBlocks record={item} />
      </ContentDetailLayout>
    </DetailPageShell>
  );
}
