'use client';

import { useEffect, useState } from 'react';
import PageHero from '@/components/public/PageHero';
import ListingPager from '@/components/public/ListingPager';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PublicListingCard from '@/components/public/PublicListingCard';
import { PUBLIC_SITE_LABELS } from '@/lib/collections';
import {
  formatPublishedDate,
  getRecordImage,
  getRecordTitle,
  publicRecordSlug,
  recordCardBlurb,
  recordPublishedAt,
} from '@/lib/data';
import { resolvePublicImage } from '@/lib/public-image';
import { stashPublicReadRecord } from '@/lib/public-read-prefill';
import type { RecordRow } from '@/lib/types';

export default function SafariUpdatesListingClient({
  initialPosts,
  initialTotal,
  page,
  pageSize,
  showHero = true,
}: {
  initialPosts: RecordRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
  showHero?: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    if (!initialPosts.length) return;
    setPosts(initialPosts);
    setTotal(initialTotal);
  }, [initialPosts, initialTotal]);

  useEffect(() => {
    if (posts.length) return undefined;
    let cancelled = false;
    const offset = (page - 1) * pageSize;

    async function load() {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        try {
          const response = await fetch(`/api/public/safari-updates?limit=${pageSize}&offset=${offset}`, {
            credentials: 'same-origin',
          });
          const body = response.ok
            ? ((await response.json()) as { posts?: RecordRow[]; total?: number })
            : null;
          if (cancelled) return;
          if (body?.posts?.length) {
            setPosts(body.posts);
            setTotal(body.total ?? body.posts.length);
            return;
          }
        } catch {
          /* try again */
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, posts.length]);

  const latest = posts[0];
  const heroImage = latest ? getRecordImage(latest) || undefined : undefined;

  return (
    <>
      {showHero ? (
        <PageHero
          variant="update"
          title={PUBLIC_SITE_LABELS.blogPosts}
          subtitle={total ? `${total.toLocaleString()} safari stories and travel notes` : 'Safari news and travel notes'}
          image={heroImage}
          published={latest ? recordPublishedAt(latest) || undefined : undefined}
        />
      ) : null}
      <ListingSection>
        {posts.length === 0 ? null : (
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
            <ListingPager basePath="/safari-updates" page={page} pageSize={pageSize} total={total} label="updates" />
          </>
        )}
      </ListingSection>
    </>
  );
}
