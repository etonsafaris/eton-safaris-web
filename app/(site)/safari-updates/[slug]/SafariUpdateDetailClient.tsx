'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import DetailPageShell from '@/components/public/DetailPageShell';
import {
  getRecordImage,
  getRecordTitle,
  isPublishedRecord,
  parseBlocksFromRecord,
  pickStoredString,
  recordPublishedAt,
  safariUpdatePublicPath,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { titleFromPublicSlug } from '@/lib/cms-routes';
import { useCmsLive } from '@/lib/cms-live';
import { readPublicReadPrefill } from '@/lib/public-read-prefill';
import type { RecordRow } from '@/lib/types';

function isReadableSafariPost(row: RecordRow | null | undefined) {
  return Boolean(row && isPublishedRecord(row));
}

/** Listing cards omit the article and post blocks. Those only exist on the full saved row. */
function postHasSavedBody(row: RecordRow | null | undefined) {
  if (!row) return false;
  const html = visibleRecordHtml(row, ['content', 'description', 'body', 'html', 'post_content', 'article']);
  if (html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) return true;
  return parseBlocksFromRecord(row).length > 0;
}

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
  const slug = params?.slug || '';
  const prefill = useMemo(() => readPublicReadPrefill('safari_updates', slug), [slug]);
  const seedPost = isReadableSafariPost(initialPost)
    ? initialPost
    : isReadableSafariPost(prefill)
      ? prefill
      : null;

  const [post, setPost] = useState<RecordRow | null>(seedPost);
  const [related, setRelated] = useState<RecordRow[]>(initialRelated);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const live = useCmsLive();
  const fullLoadAttempts = useRef(0);

  useEffect(() => {
    fullLoadAttempts.current = 0;
  }, [slug]);

  useEffect(() => {
    const nextSeed = isReadableSafariPost(initialPost)
      ? initialPost
      : isReadableSafariPost(prefill)
        ? prefill
        : null;
    setPost((current) => {
      if (postHasSavedBody(current) && !postHasSavedBody(nextSeed)) return current;
      return nextSeed;
    });
    setRelated(initialRelated);
    setTours(initialTours);
  }, [initialPost, initialRelated, initialTours, prefill]);

  useEffect(() => {
    if (!slug) return undefined;
    if (postHasSavedBody(post) && live === 0) return undefined;
    if (fullLoadAttempts.current >= 2) return undefined;
    fullLoadAttempts.current += 1;

    let cancelled = false;
    async function loadFullPost() {
      try {
        const response = await fetch(`/api/public/safari-update?slug=${encodeURIComponent(slug)}`, {
          credentials: 'same-origin',
        });
        const body = (await response.json().catch(() => ({}))) as {
          post?: RecordRow | null;
          related?: RecordRow[];
          tours?: RecordRow[];
        };
        if (cancelled || !isReadableSafariPost(body.post)) return;
        setPost(body.post ?? null);
        if (body.related?.length) setRelated(body.related);
        if (body.tours?.length) setTours(body.tours);
      } catch (error) {
        console.error('[Safari update detail] Full post load failed:', error);
      }
    }

    void loadFullPost();
    return () => {
      cancelled = true;
    };
  }, [slug, live, post]);

  useEffect(() => {
    if (!slug || related.length > 0) return undefined;
    let cancelled = false;
    fetch('/api/public/safari-updates?limit=12&offset=0', { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { posts?: RecordRow[] } | null) => {
        if (cancelled || !body?.posts?.length) return;
        const currentId = String(post?.id || '');
        const rows = body.posts.filter((row) => row && String(row.id || '') !== currentId);
        if (rows.length) setRelated(rows.slice(0, 8));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug, related.length, post?.id]);

  const country = post ? pickStoredString(post, ['country']) : '';
  const heroImage = post ? getRecordImage(post) || undefined : undefined;
  const published = useEnsurePublishedAt('safari_updates', post, '', (stamp) => {
    setPost((row) => (row ? { ...row, published_at: stamp } : row));
  });

  return (
    <DetailPageShell embedded={embedded}>
      <PageHero
        variant="update"
        title={post ? getRecordTitle(post) : titleFromPublicSlug(slug)}
        image={heroImage}
        country={undefined}
        published={published || undefined}
      />
      <ContentDetailLayout
        country={country}
        published={published || undefined}
        showLocation={false}
        hideMeta
        sidebarAlways
        sidebarTitle="Recent Updates"
        sidebarItems={(related ?? [])
          .filter(Boolean)
          .map((item) => ({
            href: safariUpdatePublicPath(item),
            image: getRecordImage(item) || undefined,
            title: getRecordTitle(item) || 'Safari update',
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
        {post ? (
          <>
            {pickStoredString(post, ['description_title']) ? (
              <h2 className="content-subheading">{pickStoredString(post, ['description_title'])}</h2>
            ) : (
              <h2 className="content-subheading">{getRecordTitle(post)}</h2>
            )}
            <PublicHtml
              className="public-prose max-w-none text-black"
              html={publicBodyHtml(
                visibleRecordHtml(post, ['content', 'description', 'body', 'html', 'post_content', 'article'])
              )}
            />
            <ContentBlocks record={post} />
          </>
        ) : null}
      </ContentDetailLayout>
    </DetailPageShell>
  );
}
