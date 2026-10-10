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
  pickStoredString,
  recordPublishedAt,
  safariUpdatePublicPath,
  visibleRecordHtml,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { useCmsLive } from '@/lib/cms-live';
import { readPublicReadPrefill } from '@/lib/public-read-prefill';
import type { RecordRow } from '@/lib/types';

function isReadableSafariPost(row: RecordRow | null | undefined) {
  return Boolean(row && isPublishedRecord(row));
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
  const [recovering, setRecovering] = useState(!seedPost);
  const live = useCmsLive();
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    recoveryAttempted.current = false;
  }, [slug]);

  useEffect(() => {
    const nextSeed = isReadableSafariPost(initialPost)
      ? initialPost
      : isReadableSafariPost(prefill)
        ? prefill
        : null;
    setPost(nextSeed);
    setRelated(initialRelated);
    setTours(initialTours);
    setRecovering(!nextSeed);
  }, [initialPost, initialRelated, initialTours, prefill]);

  useEffect(() => {
    if (!slug) return undefined;
    if (isReadableSafariPost(post) && live === 0) return undefined;

    let cancelled = false;
    async function recover() {
      if (!isReadableSafariPost(post)) {
        if (!recoveryAttempted.current) {
          recoveryAttempted.current = true;
          setRecovering(true);
          try {
            const response = await fetch(`/api/public/safari-update?slug=${encodeURIComponent(slug)}`, {
              credentials: 'same-origin',
            });
            const body = (await response.json().catch(() => ({}))) as {
              post?: RecordRow | null;
              related?: RecordRow[];
              tours?: RecordRow[];
            };
            if (cancelled) return;
            if (isReadableSafariPost(body.post)) {
              setPost(body.post ?? null);
              if (body.related?.length) setRelated(body.related);
              if (body.tours?.length) setTours(body.tours);
            }
          } catch (error) {
            console.error('[Safari update detail] Recovery failed:', error);
          } finally {
            if (!cancelled) setRecovering(false);
          }
        }
        return;
      }

      if (live === 0) return;

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
        console.error('[Safari update detail] Live refresh failed:', error);
      }
    }

    void recover();
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
        {recovering && !post ? (
          <p className="text-gray-500">Loading safari update…</p>
        ) : !post ? (
          <p className="text-gray-500">
            This post is taking longer than usual to load. Please refresh the page or open Safari Updates from the menu.
          </p>
        ) : (
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
        )}
      </ContentDetailLayout>
    </DetailPageShell>
  );
}
