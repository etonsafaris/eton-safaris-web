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
  getRecordImage,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickStoredString,
  pickString,
  recordPublishedAt,
  resolvePublicTours,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

export default function SafariUpdateDetailClient({
  embedded = false,
  initialPost = null,
  initialRelated = [],
  initialTours = [],
}: {
  embedded?: boolean;
  initialPost?: RecordRow | null;
  initialRelated?: RecordRow[];
  initialTours?: RecordRow[];
}) {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';
  const [post, setPost] = useState<RecordRow | null>(initialPost);
  const [related, setRelated] = useState<RecordRow[]>(initialRelated);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const live = useCmsLive();
  const serverGate = useServerRecordGate(initialPost);

  useEffect(() => {
    setPost(initialPost);
    setRelated(initialRelated);
    setTours(initialTours);
  }, [initialPost, initialRelated, initialTours]);

  useEffect(() => {
    if ((serverGate.current || initialPost) && live === 0) return;
    async function load() {
      try {
        const [full, updatePage] = await Promise.all([
          fetchRecordByPublicSlug('safari_updates', slug),
          fetchCollectionPage('safari_updates', [], { limit: 20, offset: 0 }),
        ]);
        const published =
          full && isPublishedRecord(full) && !isLanguagePost(full) ? full : null;
        if (!published) {
          if (initialPost && isPublishedRecord(initialPost) && !isLanguagePost(initialPost)) return;
          if (!serverGate.current && !initialPost) triggerNotFound();
          return;
        }
        setPost(published);
        setRelated(
          updatePage.rows
            .filter(isPublishedRecord)
            .filter((row) => String(row.id) !== String(published?.id || '') && !isLanguagePost(row))
            .slice(0, 20)
        );
        const country = published ? pickStoredString(published, ['country', 'category']) : '';
        const tourRows = await resolvePublicTours({
          country,
          limit: 12,
          excludeId: published.id != null ? String(published.id) : undefined,
        });
        if (tourRows.length) setTours(tourRows);
      } catch (error) {
        console.error('[Safari update detail] Failed to load post:', error);
        if (!serverGate.current) {
          setPost(null);
          setRelated([]);
          triggerNotFound();
        }
      }
    }
    void load();
  }, [slug, live, router, serverGate, initialPost]);

  const country = post ? pickStoredString(post, ['country']) : '';
  const heroImage = post ? getRecordImage(post) || undefined : undefined;
  const published = useEnsurePublishedAt('safari_updates', post, '', (stamp) => {
    setPost((row) => (row ? { ...row, published_at: stamp } : row));
  });

  return (
    <DetailPageShell embedded={embedded}>
      <PageHero
        variant="update"
        title={post ? getRecordTitle(post) : 'Safari Update'}
        image={heroImage}
        country={undefined}
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
        below={
          <section id="tour-packages" className="bg-[#f3f6f5]">
            <AmazingSafaris
              tours={tours}
              title={country ? `Explore These Amazing Safaris in ${country}` : 'Explore Our Amazing Safaris'}
              emptyMessage="Tour packages for this destination will appear here."
            />
          </section>
        }
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
    </DetailPageShell>
  );
}
