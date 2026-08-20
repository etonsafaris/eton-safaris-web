'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  pickPlainText,
  pickStoredString,
  pickString,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
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
  const live = useCmsLive();

  useEffect(() => {
    async function load() {
      try {
        const [parks, accommodations] = await Promise.all([
          fetchCollectionRecords('national_park', ['national_parks', 'parks']),
          fetchCollectionRecords('accommodations'),
        ]);
        const match =
          parks.find((row) => pickString(row, ['slug']) === slug || String(row.id) === slug) || null;
        setPark(match);
        setOthers(parks.filter(isPublishedRecord).filter((row) => row !== match).slice(0, 20));
        const parkName = match ? getRecordTitle(match) : '';
        setStays(
          accommodations.filter(isPublishedRecord).filter((item) => {
            const name = pickStoredString(item, ['national_park', 'park', 'park_name']);
            return Boolean(parkName && name && name.toLowerCase() === parkName.toLowerCase());
          })
        );
      } catch (error) {
        console.error(error);
      }
    }
    load();
  }, [slug, live]);

  const stayItems = useMemo(
    () =>
      stays.map((stay, index) => (
        <PlaceCard
          key={String(stay.id ?? index)}
          href={`/accommodations/${pickString(stay, ['slug']) || stay.id}`}
          image={getRecordImage(stay) || undefined}
          title={getRecordTitle(stay)}
          location={pickStoredString(stay, ['type', 'location'])}
          description={pickPlainText(stay, ['description'])}
          cta="View Stay"
        />
      )),
    [stays]
  );

  if (!park) {
    return (
      <PublicShell>
        <p className="px-4 py-20 text-center text-gray-500">No records found in this collection.</p>
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
        image={getRecordImage(park)}
      />
      <ContentDetailLayout
        country={pickString(park, ['country'])}
        location={pickString(park, ['location'])}
        published={recordPublishedAt(park)}
        sidebarTitle="Other Parks"
        sidebarItems={others.map((item) => ({
          href: `/parks/${pickString(item, ['slug']) || item.id}`,
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
