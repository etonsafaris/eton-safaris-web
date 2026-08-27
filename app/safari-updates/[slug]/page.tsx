'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecordById,
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickStoredString,
  pickString,
  publicListColumnsFor,
  recordPublishedAt,
  TOUR_LIST_COLUMNS,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { matchesCountry } from '@/lib/country-utils';
import { publicBodyHtml } from '@/lib/embedded-content';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

export default function SafariUpdateDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [post, setPost] = useState<RecordRow | null>(null);
  const [related, setRelated] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);
  const live = useCmsLive();

  useEffect(() => {
    async function load() {
      try {
        const updateCols = publicListColumnsFor('safari_updates');
        const [rows, tourRows] = await Promise.all([
          fetchCollectionRecords('safari_updates', [], updateCols ? { columns: updateCols } : undefined),
          fetchCollectionRecords('tours', [], { columns: TOUR_LIST_COLUMNS }),
        ]);
        const match =
          rows.find((row) => pickString(row, ['slug', 'seo_slug']) === slug || String(row.id) === slug) || null;
        const full =
          match?.id != null
            ? (await fetchCollectionRecordById('safari_updates', String(match.id))) || match
            : match;
        setPost(full && isPublishedRecord(full) ? full : null);
        setRelated(
          rows.filter(isPublishedRecord).filter((row) => row !== match && !isLanguagePost(row)).slice(0, 20)
        );
        const country = full ? pickStoredString(full, ['country', 'category']) : '';
        setTours(
          tourRows
            .filter(isPublishedRecord)
            .filter((tour) => (country ? matchesCountry(tour, country) : true))
            .slice(0, 12)
        );
      } catch (error) {
        console.error(error);
      }
    }
    void load();
  }, [slug, live]);

  const country = post ? pickStoredString(post, ['country']) : '';
  const heroImage = post ? getRecordImage(post) || undefined : undefined;
  const published = useEnsurePublishedAt('safari_updates', post, '', (stamp) => {
    setPost((row) => (row ? { ...row, published_at: stamp } : row));
  });

  return (
    <PublicShell>
      <PageHero
        variant="update"
        title={post ? getRecordTitle(post) : 'Safari Update'}
        image={heroImage}
        country={country || undefined}
        published={published || undefined}
      />
      <ContentDetailLayout
        country={country}
        published={published || undefined}
        showLocation={false}
        hideMeta
        sidebarTitle="Recent Updates"
        sidebarItems={related.map((item) => ({
          href: `/safari-updates/${pickString(item, ['slug']) || item.id}`,
          image: getRecordImage(item),
          title: getRecordTitle(item),
          date: formatPublishedDate(recordPublishedAt(item)),
        }))}
        below={<AmazingSafaris tours={tours} />}
      >
        {!post ? (
          <p className="text-gray-500">No records found in this collection.</p>
        ) : (
          <>
            {pickStoredString(post, ['description_title']) ? (
              <h2 className="content-subheading">
                {pickStoredString(post, ['description_title'])}
              </h2>
            ) : (
              <h2 className="content-subheading">
                {getRecordTitle(post)}
              </h2>
            )}
            <div
              className="public-prose max-w-none text-black"
              dangerouslySetInnerHTML={{
                __html: publicBodyHtml(visibleRecordHtml(post, ['content', 'description'])),
              }}
            />
            <ContentBlocks record={post} />
          </>
        )}
      </ContentDetailLayout>
    </PublicShell>
  );
}
