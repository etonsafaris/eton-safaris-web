'use client';

import { useEffect, useState } from 'react';
import ListingSection, { ListingGrid } from '@/components/public/ListingSection';
import PageHero from '@/components/public/PageHero';
import PlaceCard from '@/components/public/PlaceCard';
import PublicShell from '@/components/public/PublicShell';
import SectionHeading from '@/components/public/SectionHeading';
import {
  fetchCollectionRecords,
  getRecordImage,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickPlainText,
  pickString,
} from '@/lib/data';
import { useCmsLive } from '@/lib/cms-live';
import type { RecordRow } from '@/lib/types';

function formatJournalDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export default function SafariUpdatesPageClient({ initialPosts }: { initialPosts: RecordRow[] }) {
  const live = useCmsLive();
  const [posts, setPosts] = useState<RecordRow[]>(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    if (live === 0) return;
    fetchCollectionRecords('safari_updates')
      .then((rows) => setPosts(rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row))))
      .catch((error) => console.error(error));
  }, [live]);

  return (
    <PublicShell>
      <PageHero
        title="Safari Updates"
        subtitle="News, guides, and stories from across Africa."
        image={posts[0] ? getRecordImage(posts[0]) : undefined}
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
                  date={formatJournalDate(pickString(post, ['published_at', 'created_at']))}
                  description={pickPlainText(post, ['excerpt', 'description', 'content'])}
                  cta="Read More"
                />
              ))}
            </ListingGrid>
          </div>
        )}
      </ListingSection>
    </PublicShell>
  );
}
