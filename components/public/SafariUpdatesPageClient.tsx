'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import SectionHeading from '@/components/public/SectionHeading';
import {
  fetchCollectionPage,
  getRecordImage,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickPlainText,
  pickString,
  recordPublishedAt,
} from '@/lib/data';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { useCmsLive } from '@/lib/cms-live';
import { SITE_MEDIA } from '@/lib/site-media';
import type { RecordRow } from '@/lib/types';

export default function SafariUpdatesPageClient({
  initialPosts,
  initialTotal = 0,
}: {
  initialPosts: RecordRow[];
  initialTotal?: number;
}) {
  const live = useCmsLive();
  const [posts, setPosts] = useState<RecordRow[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal || initialPosts.length);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setPosts(initialPosts);
    setTotal(initialTotal || initialPosts.length);
  }, [initialPosts, initialTotal]);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionPage('safari_updates', [], { limit: 48, offset: 0 })
      .then((page) => {
        if (cancelled) return;
        const rows = page.rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row));
        setPosts(rows);
        setTotal(page.total);
      })
      .catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [live]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchCollectionPage('safari_updates', [], {
        limit: 48,
        offset: posts.length,
      });
      setPosts((current) => {
        const seen = new Set(current.map((row) => String(row.id || '')));
        return [
          ...current,
          ...page.rows
            .filter((row) => isPublishedRecord(row) && !isLanguagePost(row))
            .filter((row) => !seen.has(String(row.id || ''))),
        ];
      });
      setTotal(page.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <PublicShell>
      <PageHero
        title="Safari Updates"
        subtitle="News, guides, and stories from across Africa."
        image={SITE_MEDIA.safariUpdatesHero}
      />
      <ListingSection>
        <SectionHeading label="stay up to date with" title="Safari Updates" />
        <p className="mt-2 text-center text-sm text-[#555]">
          <a href="/safari-updates/rss.xml" className="text-moss hover:underline">
            Subscribe by RSS
          </a>
        </p>
        {posts.length === 0 ? (
          <p className="mt-16 text-center text-gray-500">No records found in this collection.</p>
        ) : (
          <div className="mt-10">
            <ListingGrid>
              {posts.map((post, index) => (
                <PlaceCard
                  key={String(post.id ?? index)}
                  href={`/safari-updates/${pickString(post, ['slug']) || post.id}`}
                  image={getRecordImage(post) || undefined}
                  title={getRecordTitle(post)}
                  date={
                    recordPublishedAt(post) ? formatPublishedDate(recordPublishedAt(post)) : undefined
                  }
                  description={pickPlainText(post, ['excerpt', 'description', 'content'])}
                  cta="Read More"
                />
              ))}
            </ListingGrid>
            {posts.length < total ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-full bg-moss px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#4a6b3a] disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : `Load more updates (${posts.length} of ${total.toLocaleString()})`}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </ListingSection>
    </PublicShell>
  );
}
