'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickStoredString,
  pickString,
  publicListColumnsFor,
  publicRecordSlug,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import { useCmsLive } from '@/lib/cms-live';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import type { RecordRow } from '@/lib/types';

export default function ParkDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [park, setPark] = useState<RecordRow | null>(null);
  const [others, setOthers] = useState<RecordRow[]>([]);
  const [stays, setStays] = useState<RecordRow[]>([]);
  const [ready, setReady] = useState(false);
  const live = useCmsLive();

  useEffect(() => {
    async function load() {
      try {
        const parkCols = publicListColumnsFor('national_park', ['national_parks', 'parks']);
        const stayCols = publicListColumnsFor('accommodations');
        const [parks, accommodations] = await Promise.all([
          fetchCollectionRecords('national_park', ['national_parks', 'parks'], parkCols ? { columns: parkCols } : undefined),
          fetchCollectionRecords('accommodations', [], stayCols ? { columns: stayCols } : undefined),
        ]);
        const match =
          parks.find(
            (row) => publicRecordSlug(row) === slug || pickString(row, ['slug', 'seo_slug']) === slug || String(row.id) === slug
          ) || null;
        const full =
          match?.id != null
            ? (await fetchCollectionRecordById('national_park', String(match.id), ['national_parks', 'parks'])) ||
              match
            : match;
        setPark(full && isPublishedRecord(full) ? full : null);
        setOthers(parks.filter(isPublishedRecord).filter((row) => row !== match).slice(0, 20));
        const parkName = full ? getRecordTitle(full) : '';
        setStays(
          accommodations.filter(isPublishedRecord).filter((item) => {
            const name = pickStoredString(item, ['national_park_name', 'national_park', 'park', 'park_name']);
            return Boolean(parkName && name && name.toLowerCase() === parkName.toLowerCase());
          })
        );
      } catch (error) {
        console.error(error);
      } finally {
        setReady(true);
      }
    }
    load();
  }, [slug, live]);

  const stayItems = useMemo(
    () =>
      stays.slice(0, 10).map((stay, index) => (
        <PlaceCard
          key={String(stay.id ?? index)}
          href={`/accommodations/${publicRecordSlug(stay)}`}
          image={getRecordImage(stay) || undefined}
          title={getRecordTitle(stay)}
          location={pickStoredString(stay, ['type', 'location'])}
          description={pickPlainText(stay, ['description'])}
          cta="View Stay"
        />
      )),
    [stays]
  );

  const published = useEnsurePublishedAt('national_park', park, '', (stamp) => {
    setPark((row) => (row ? { ...row, published_at: stamp } : row));
  });

  if (!ready || !park) {
    return (
      <PublicShell>
        {ready ? (
          <p className="px-4 py-20 text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <div className="h-[338px] bg-[#141612] md:h-[398px]" />
        )}
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
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{stayItems}</div>
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
