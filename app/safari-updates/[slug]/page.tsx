'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AmazingSafaris from '@/components/public/AmazingSafaris';
import ContentBlocks from '@/components/public/ContentBlocks';
import ContentDetailLayout from '@/components/public/ContentDetailLayout';
import PageHero from '@/components/public/PageHero';
import PublicShell from '@/components/public/PublicShell';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickStoredString,
  pickString,
  recordPublishedAt,
  visibleRecordHtml,
} from '@/lib/data';
import { matchesCountry } from '@/lib/country-utils';
import { publicBodyHtml } from '@/lib/embedded-content';
import { SITE_MEDIA } from '@/lib/site-media';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import type { RecordRow } from '@/lib/types';

export default function SafariUpdateDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [post, setPost] = useState<RecordRow | null>(null);
  const [related, setRelated] = useState<RecordRow[]>([]);
  const [tours, setTours] = useState<RecordRow[]>([]);

  useEffect(() => {
    Promise.all([fetchCollectionRecords('safari_updates'), fetchCollectionRecords('tours')])
      .then(([rows, tourRows]) => {
        const match = rows.find(
          (row) => pickString(row, ['slug']) === slug || String(row.id) === slug
        );
        setPost(match || null);
        setRelated(rows.filter(isPublishedRecord).filter((row) => row !== match && !isLanguagePost(row)).slice(0, 20));
        const country = match ? pickStoredString(match, ['country']) : '';
        setTours(
          tourRows
            .filter(isPublishedRecord)
            .filter((tour) => (country ? matchesCountry(tour, country) : true))
            .slice(0, 12)
        );
      })
      .catch((error) => console.error(error));
  }, [slug]);

  const country = post ? pickStoredString(post, ['country']) : '';
  const heroImage =
    (post && (getRecordImage(post) || pickString(post, ['image_url', 'social_image_url', 'cover_image']))) ||
    SITE_MEDIA.wildlifeNationalPark;

  return (
    <PublicShell>
      <PageHero
        variant="park"
        title={post ? getRecordTitle(post) : 'Safari Update'}
        image={heroImage}
      />
      <ContentDetailLayout
        country={country}
        published={recordPublishedAt(post)}
        showLocation={false}
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
