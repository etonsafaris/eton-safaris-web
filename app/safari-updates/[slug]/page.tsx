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
  isLanguagePost,
  isPublishedRecord,
  pickStoredString,
  pickString,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
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
        const [full, updatePage] = await Promise.all([
          fetchRecordByPublicSlug('safari_updates', slug),
          fetchCollectionPage('safari_updates', [], { limit: 20, offset: 0 }),
        ]);
        const published = full && isPublishedRecord(full) ? full : null;
        setPost(published);
        setRelated(
          updatePage.rows
            .filter(isPublishedRecord)
            .filter((row) => String(row.id) !== String(published?.id || '') && !isLanguagePost(row))
            .slice(0, 20)
        );
        const country = published ? pickStoredString(published, ['country', 'category']) : '';
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
