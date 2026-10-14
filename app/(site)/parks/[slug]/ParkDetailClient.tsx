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
  fetchRecordByPublicSlug,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickStoredString,
  pickString,
  resolvePublicTours,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { titleFromPublicSlug } from '@/lib/cms-routes';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

export default function ParkDetailClient({
  embedded = false,
  initialPark = null,
  initialOthers: _initialOthers = [],
  initialTours = [],
}: {
  embedded?: boolean;
  initialPark?: RecordRow | null;
  initialOthers?: RecordRow[];
  initialTours?: RecordRow[];
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';
  const [park, setPark] = useState<RecordRow | null>(initialPark);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const live = useCmsLive();
  const serverGate = useServerRecordGate(initialPark);

  useEffect(() => {
    setPark(initialPark);
    setTours(initialTours);
  }, [initialPark, initialTours]);

  useEffect(() => {
    if (serverGate.current && live === 0) return;
    async function load() {
      try {
        const full = await fetchRecordByPublicSlug('national_park', slug, ['national_parks', 'parks']);
        const published = full && isPublishedRecord(full) ? full : null;
        if (published) {
          setPark(published);
          const country = pickStoredString(published, ['country']);
          const tourRows = await resolvePublicTours({ country, limit: 12 });
          if (tourRows.length) setTours(tourRows);
          return;
        }
        if (!serverGate.current) triggerNotFound();
        if (!serverGate.current) {
          setPark(null);
          setTours([]);
        }
      } catch (error) {
        console.error('[Park detail] Failed to load park:', error);
        if (!serverGate.current) {
          setPark(null);
          setTours([]);
          triggerNotFound();
        }
      }
    }
    load();
  }, [slug, live, router, serverGate]);

  const published = useEnsurePublishedAt('national_park', park, '', (stamp) => {
    setPark((row) => (row ? { ...row, published_at: stamp } : row));
  });

  if (!park) {
    return (
      <DetailPageShell embedded={embedded}>
        <PageHero variant="park" title={titleFromPublicSlug(slug)} />
      </DetailPageShell>
    );
  }

  const parkName = getRecordTitle(park);
  const countryLabel = pickString(park, ['country']);

  return (
    <DetailPageShell embedded={embedded}>
      <PageHero
        variant="park"
        title={parkName}
        location={pickString(park, ['location']) || undefined}
        country={countryLabel || undefined}
        published={published || undefined}
        image={getRecordImage(park)}
      />
      <ContentDetailLayout
        hideMeta
        country={countryLabel}
        sidebarTitle="Other National Parks"
        sidebarItems={[]}
        below={
          <AmazingSafaris
            tours={tours}
            title={
              countryLabel
                ? `Explore These Amazing Safaris in ${countryLabel}`
                : 'Explore Our Amazing Safaris'
            }
            emptyMessage="Tour packages for this destination will appear here."
          />
        }
      >
        {pickStoredString(park, ['description_title']) && (
          <h2 className="content-subheading">
            {pickStoredString(park, ['description_title'])}
          </h2>
        )}
        <PublicHtml
          className="public-prose max-w-none text-black"
          html={publicBodyHtml(visibleRecordHtml(park, ['description']))}
        />
        <ContentBlocks record={park} />
      </ContentDetailLayout>
    </DetailPageShell>
  );
}
