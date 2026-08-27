'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionPage,
  fetchFeaturedTours,
  fetchRecordByPublicSlug,
  fetchToursForCountryLabel,
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
import PageFaqList from '@/components/public/PageFaqList';
import { bestFaqsFor } from '@/lib/best-faqs';

export default function AccommodationDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [item, setItem] = useState<RecordRow | null>(null);
  const [others, setOthers] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);
  const live = useCmsLive();

  useEffect(() => {
    async function load() {
      try {
        const [full, stayPage] = await Promise.all([
          fetchRecordByPublicSlug('accommodations', slug),
          fetchCollectionPage('accommodations', [], { limit: 20, offset: 0 }),
        ]);
        const published = full && isPublishedRecord(full) ? full : null;
        setItem(published);
        setOthers(
          stayPage.rows
            .filter(isPublishedRecord)
            .filter((row) => String(row.id) !== String(published?.id || ''))
            .slice(0, 20)
        );
        const country = published ? pickStoredString(published, ['country']) : '';
        const tourRows = country
          ? await fetchToursForCountryLabel(country, 12)
          : await fetchFeaturedTours(12);
        setTours(tourRows.filter((row) => String(row.id) !== String(published?.id || '')).slice(0, 12));
      } catch (error) {
        console.error(error);
      }
    }
    void load();
  }, [slug, live]);

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
          />
        }
      >
        {pickStoredString(item, ['description_title']) && (
          <h2 className="content-subheading">
            {pickStoredString(item, ['description_title'])}
          </h2>
        )}
        {(pickStoredString(item, ['website', 'website_url']) || '').startsWith('http') ? (
          <p className="mb-4 text-sm text-[#374151]">
            Official site:{' '}
            <a
              href={pickStoredString(item, ['website', 'website_url'])}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00A651] hover:underline"
            >
              {pickStoredString(item, ['website', 'website_url']).replace(/^https?:\/\//, '')}
            </a>
          </p>
        ) : null}
        <div
          className="public-prose max-w-none"
          dangerouslySetInnerHTML={{ __html: publicBodyHtml(visibleRecordHtml(item, ['description'])) }}
        />
        <ContentBlocks record={item} />
        <PageFaqList
          faqs={bestFaqsFor('stay', {
            countrySlug: pickString(item, ['country']),
            countryName: pickString(item, ['country']),
            title: getRecordTitle(item),
          })}
          tone="light"
        />
      </ContentDetailLayout>
    </PublicShell>
  );
}
