'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Carousel from '@/components/public/Carousel';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionPage,
  fetchRecordByPublicSlug,
  fetchStaysForPark,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickStoredString,
  pickString,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import { useCmsLive } from '@/lib/cms-live';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import type { RecordRow } from '@/lib/types';

export default function ParkDetailClient({
  initialPark = null,
  initialOthers = [],
  initialStays = [],
}: {
  initialPark?: RecordRow | null;
  initialOthers?: RecordRow[];
  initialStays?: RecordRow[];
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';
  const [park, setPark] = useState<RecordRow | null>(initialPark);
  const [others, setOthers] = useState<RecordRow[]>(initialOthers);
  const [stays, setStays] = useState<RecordRow[]>(initialStays);
  const [ready, setReady] = useState(Boolean(initialPark));
  const live = useCmsLive();

  useEffect(() => {
    setPark(initialPark);
    setOthers(initialOthers);
    setStays(initialStays);
    setReady(Boolean(initialPark));
  }, [initialPark, initialOthers, initialStays]);

  useEffect(() => {
    if (initialPark && live === 0) return;
    async function load() {
      try {
        const [full, parkPage] = await Promise.all([
          fetchRecordByPublicSlug('national_park', slug, ['national_parks', 'parks']),
          fetchCollectionPage('national_park', ['national_parks', 'parks'], { limit: 20, offset: 0 }),
        ]);
        const published = full && isPublishedRecord(full) ? full : null;
        if (published) {
          setPark(published);
          setOthers(
            parkPage.rows
              .filter(isPublishedRecord)
              .filter((row) => String(row.id) !== String(published.id || ''))
              .slice(0, 20)
          );
          setReady(true);
          const parkName = getRecordTitle(published);
          const parkId = published.id != null ? String(published.id) : '';
          setStays(await fetchStaysForPark(parkName, 24, parkId).catch(() => []));
          return;
        }
        if (!initialPark) router.replace('/404');
        if (!initialPark) {
          setPark(null);
          setOthers([]);
          setStays([]);
        }
      } catch (error) {
        console.error('[Park detail] Failed to load park:', error);
        if (!initialPark) {
          setPark(null);
          setOthers([]);
          setStays([]);
          router.replace('/404');
        }
      } finally {
        setReady(true);
      }
    }
    load();
  }, [slug, live, router, initialPark]);

  const stayItems = useMemo(
    () =>
      stays.map((stay, index) => (
        <PlaceCard
          key={String(stay.id ?? index)}
          href={`/accommodations/${publicRecordSlug(stay)}`}
          image={getRecordImage(stay) || undefined}
          title={getRecordTitle(stay)}
          location={pickStoredString(stay, ['type', 'location'])}
          description={recordCardBlurb(stay)}
          record={stay}
          date={formatPublishedDate(recordPublishedAt(stay))}
          cta="View Stay"
        />
      )),
    [stays]
  );

  const published = useEnsurePublishedAt('national_park', park, '', (stamp) => {
    setPark((row) => (row ? { ...row, published_at: stamp } : row));
  });

  if (!park) {
    return (
      <PublicShell>
        <p className="px-4 py-20 text-center text-gray-500">
          {ready ? 'No records found in this collection.' : 'Loading park…'}
        </p>
      </PublicShell>
    );
  }

  const parkName = getRecordTitle(park);

  return (
    <PublicShell>
      <PageHero
        variant="park"
        title={parkName}
        location={pickString(park, ['location']) || undefined}
        country={pickString(park, ['country']) || undefined}
        published={published || undefined}
        image={getRecordImage(park)}
      />
      <ContentDetailLayout
        hideMeta
        country={pickString(park, ['country'])}
        sidebarTitle="Other Parks"
        sidebarItems={others.map((item) => ({
          href: `/parks/${publicRecordSlug(item)}`,
          image: getRecordImage(item),
          title: getRecordTitle(item),
          date: formatPublishedDate(recordPublishedAt(item)),
        }))}
        below={
          stays.length > 0 ? (
            <section className="bg-white pb-12">
              <div className="px-5">
                <div className="dav-amazing-title">
                  <h3>Where to Stay in {parkName}</h3>
                  <span className="dav-amazing-underline" />
                </div>
                <div className="mt-8 px-2 sm:px-6">
                  <Carousel
                    items={stayItems}
                    itemsPerView={{ sm: 1, md: 2, lg: 4 }}
                    autoPlayMs={4000}
                    pauseOnHover
                    emptyMessage="No records found in this collection."
                  />
                </div>
              </div>
            </section>
          ) : null
        }
      >
        {pickStoredString(park, ['description_title']) && (
          <h2 className="content-subheading">
            {pickStoredString(park, ['description_title'])}
          </h2>
        )}
        <div
          className="public-prose max-w-none text-black"
          dangerouslySetInnerHTML={{ __html: publicBodyHtml(visibleRecordHtml(park, ['description'])) }}
        />
        <ContentBlocks record={park} />
      </ContentDetailLayout>
    </PublicShell>
  );
}
