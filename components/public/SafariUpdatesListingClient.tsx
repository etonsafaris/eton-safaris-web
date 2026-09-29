'use client';

import { useEffect, useRef, useState } from 'react';
import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PublicListingCard from '@/components/public/PublicListingCard';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  publicRecordSlug,
  recordCardBlurb,
} from '@/lib/data';
import { resolvePublicImage } from '@/lib/public-image';
import { stashPublicReadRecord } from '@/lib/public-read-prefill';
import { SITE_MEDIA } from '@/lib/site-media';
import type { RecordRow } from '@/lib/types';

export default function SafariUpdatesListingClient({
  initialPosts,
  initialTotal,
  page,
  pageSize,
}: {
  initialPosts: RecordRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const attemptedRef = useRef(false);

  useEffect(() => {
    setPosts(initialPosts);
    setTotal(initialTotal);
  }, [initialPosts, initialTotal]);

  useEffect(() => {
    if (posts.length || attemptedRef.current) return undefined;
    attemptedRef.current = true;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const offset = (page - 1) * pageSize;
      fetch(`/api/public/safari-updates?limit=${pageSize}&offset=${offset}`, { credentials: 'same-origin' })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { posts?: RecordRow[]; total?: number } | null) => {
          if (cancelled || !body?.posts?.length) return;
          setPosts(body.posts);
          setTotal(body.total ?? body.posts.length);
        })
        .catch(() => undefined);
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, pageSize, posts.length]);

  return (
    <ListingSection>
      {posts.length === 0 ? (
        <p className="text-center text-gray-500">Loading safari updates…</p>
      ) : (
        <>
          <ListingGrid>
            {posts.map((post, index) => (
              <PublicListingCard
                key={String(post.id ?? index)}
                href={`/safari-updates/${publicRecordSlug(post)}`}
                image={resolvePublicImage(getRecordImage(post) || '') || undefined}
                title={getRecordTitle(post)}
                date={formatPublishedDate(post)}
                description={recordCardBlurb(post)}
                cta="Read More"
                onNavigate={() => stashPublicReadRecord('safari_updates', post)}
              />
            ))}
          </ListingGrid>
          <ListingPager
            basePath="/safari-updates"
            page={page}
            pageSize={pageSize}
            total={total}
            label="updates"
          />
        </>
      )}
    </ListingSection>
  );
}
