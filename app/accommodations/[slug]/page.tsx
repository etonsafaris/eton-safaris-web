'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
import { fetchCollectionRecords, getRecordImage, getRecordTitle, isPublishedRecord, pickStoredString, pickString, recordPublishedAt, visibleRecordHtml } from '@/lib/data';
import { matchesCountry } from '@/lib/country-utils';
import { publicBodyHtml } from '@/lib/embedded-content';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

export default function AccommodationDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [item, setItem] = useState<RecordRow | null>(null);
  const [others, setOthers] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);
  const live = useCmsLive();

  useEffect(() => {
    Promise.all([fetchCollectionRecords('accommodations'), fetchCollectionRecords('tours')])
      .then(([rows, tourRows]) => {
        const match =
          rows.find((row) => pickString(row, ['slug']) === slug || String(row.id) === slug) || null;
        setItem(match);
        setOthers(rows.filter(isPublishedRecord).filter((row) => row !== match).slice(0, 20));
        const country = match ? pickStoredString(match, ['country']) : '';
        setTours(
          tourRows
            .filter(isPublishedRecord)
            .filter((tour) => (country ? matchesCountry(tour, country) : true))
            .slice(0, 12)
        );
      })
      .catch((error) => console.error(error));
  }, [slug, live]);

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
          { label: 'Published', value: recordPublishedAt(item) },
        ]}
      />
      <ContentDetailLayout
        hideMeta
        country={pickString(item, ['country'])}
        sidebarTitle="Other Accommodations"
        sidebarItems={others.map((row) => ({
          href: `/accommodations/${pickString(row, ['slug']) || row.id}`,
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
