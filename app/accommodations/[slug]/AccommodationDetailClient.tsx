'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
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
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

export default function AccommodationDetailClient({
  initialItem = null,
  initialOthers = [],
  initialTours = [],
}: {
  initialItem?: RecordRow | null;
  initialOthers?: RecordRow[];
  initialTours?: RecordRow[];
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';
  const [item, setItem] = useState<RecordRow | null>(initialItem);
  const [others, setOthers] = useState<RecordRow[]>(initialOthers);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const live = useCmsLive();

  useEffect(() => {
    setItem(initialItem);
    setOthers(initialOthers);
    setTours(initialTours);
  }, [initialItem, initialOthers, initialTours]);

  useEffect(() => {
    if (initialItem && live === 0) return;
    async function load() {
      try {
        const [full, stayPage] = await Promise.all([
          fetchRecordByPublicSlug('accommodations', slug),
          fetchCollectionPage('accommodations', [], { limit: 20, offset: 0 }),
        ]);
        const published = full && isPublishedRecord(full) ? full : null;
        if (!published) {
          if (!initialItem) router.replace('/404');
          return;
        }
        setItem(published);
        setOthers(
          stayPage.rows
            .filter(isPublishedRecord)
            .filter((row) => String(row.id) !== String(published?.id || ''))
            .slice(0, 20)
        );
        const country = published ? pickStoredString(published, ['country']) : '';
        const tourRows = await resolvePublicTours({
          country,
          limit: 12,
          excludeId: published.id != null ? String(published.id) : undefined,
        });
        if (tourRows.length) setTours(tourRows);
      } catch (error) {
        console.error('[Accommodation detail] Failed to load stay:', error);
        if (!initialItem) {
          setItem(null);
          setOthers([]);
          setTours([]);
          router.replace('/404');
        }
      }
    }
    void load();
  }, [slug, live, router, initialItem]);

  const published = useEnsurePublishedAt('accommodations', item, '', (stamp) => {
    setItem((row) => (row ? { ...row, published_at: stamp } : row));
  });

  if (!item) {
    return (
      <PublicShell>
        <p className="px-4 py-20 text-center text-gray-500">No records found in this collection.</p>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PageHero
        variant="park"
        title={getRecordTitle(item)}
        image={getRecordImage(item)}
        metaItems={[
          { label: 'Country', value: pickString(item, ['country']) },
          { label: 'National Park', value: pickStoredString(item, ['national_park', 'park', 'park_name']) },
          { label: 'Type', value: pickStoredString(item, ['type']) },
          { label: 'Published', value: published },
        ]}
      />
      <ContentDetailLayout
        hideMeta
        country={pickString(item, ['country'])}
        sidebarTitle="Other Accommodations"
        sidebarItems={others.map((row) => ({
          href: `/accommodations/${publicRecordSlug(row)}`,
          image: getRecordImage(row),
          title: getRecordTitle(row),
          date: formatPublishedDate(recordPublishedAt(row)),
        }))}
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
        <div
          className="public-prose max-w-none"
          dangerouslySetInnerHTML={{ __html: publicBodyHtml(visibleRecordHtml(item, ['description'])) }}
        />
        <ContentBlocks record={item} />
      </ContentDetailLayout>
    </PublicShell>
  );
}
