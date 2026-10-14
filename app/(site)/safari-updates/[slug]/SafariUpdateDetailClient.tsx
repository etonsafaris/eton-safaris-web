'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import DetailPageShell from '@/components/public/DetailPageShell';
import {
  getRecordImage,
  getRecordTitle,
  parseBlocksFromRecord,
  pickStoredString,
  recordPublishedAt,
  safariUpdatePublicPath,
  visibleRecordHtml,
  resolvePublicTours,
} from '@/lib/data';
import { useEnsurePublishedAt } from '@/lib/use-ensure-published-at';
import { publicBodyHtml } from '@/lib/embedded-content';
import PublicHtml from '@/components/public/PublicHtml';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { titleFromPublicSlug } from '@/lib/cms-routes';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

/** Listing cards only carry a short excerpt. The article and admin blocks live on the full saved row. */
function postHasSavedBody(row: RecordRow | null | undefined) {
  if (!row) return false;
  if (parseBlocksFromRecord(row).length > 0) return true;
  const html = visibleRecordHtml(row, ['content', 'body', 'html', 'post_content', 'article']);
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length >= 220;
}

export default function SafariUpdateDetailClient({
  embedded = false,
  initialPost = null,
  initialHeroImage = '',
  initialRelated = [],
  initialTours = [],
}: {
  embedded?: boolean;
  initialPost?: RecordRow | null;
  initialHeroImage?: string;
  initialRelated?: RecordRow[];
  initialTours?: RecordRow[];
}) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const seedPost = postHasSavedBody(initialPost) ? initialPost : null;

  const [post, setPost] = useState<RecordRow | null>(seedPost);
  const [related, setRelated] = useState<RecordRow[]>(initialRelated);
  const [tours, setTours] = useState<RecordRow[]>(initialTours);
  const live = useCmsLive();

  useEffect(() => {
    setPost((current) => {
      if (postHasSavedBody(current) && !postHasSavedBody(initialPost)) return current;
      if (postHasSavedBody(initialPost)) return initialPost;
      return current;
    });
    if (initialRelated.length) setRelated(initialRelated);
    if (initialTours.length) setTours(initialTours);
  }, [initialPost, initialRelated, initialTours]);

  useEffect(() => {
    if (!slug) return undefined;
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
        if (cancelled) return;
        if (postHasSavedBody(body.post)) {
          setPost((current) => (postHasSavedBody(current) ? current : body.post ?? current));
        }
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
  }, [slug, live]);

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

  useEffect(() => {
    if (!post || tours.length > 0) return undefined;
    const countryName = pickStoredString(post, ['country', 'category']);
    let cancelled = false;
    resolvePublicTours({
      country: countryName,
      limit: 12,
      excludeId: post.id != null ? String(post.id) : undefined,
    })
      .then((rows) => {
        if (!cancelled && rows.length) setTours(rows.slice(0, 12));
      })
      .catch((error) => console.error('[Safari update detail] Tours failed:', error));
    return () => {
      cancelled = true;
    };
  }, [post, tours.length]);

  const country = post ? pickStoredString(post, ['country']) : '';
  const heroImage = (post ? getRecordImage(post) : '') || initialHeroImage || undefined;
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
                visibleRecordHtml(post, ['content', 'body', 'html', 'post_content', 'article'])
              )}
            />
            <ContentBlocks record={post} />
          </>
        ) : null}
      </ContentDetailLayout>
    </DetailPageShell>
  );
}
