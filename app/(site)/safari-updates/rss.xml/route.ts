import { NextResponse } from 'next/server';
import { SITE } from '@/lib/collections';
import {
  fetchCollectionRecords,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickPlainText,
  pickString,
  recordPublishedAt,
} from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const rows = await fetchCollectionRecords('safari_updates', [], { maxRows: 48 }).catch(() => []);
  const posts = rows.filter((row) => isPublishedRecord(row) && !isLanguagePost(row)).slice(0, 40);
  const items = posts
    .map((post) => {
      const slug = pickString(post, ['slug']) || String(post.id || '');
      const title = xmlEscape(getRecordTitle(post));
      const description = xmlEscape(pickPlainText(post, ['excerpt', 'description', 'content']).slice(0, 280));
      const link = `${SITE.url}/safari-updates/${slug}`;
      const date = recordPublishedAt(post);
      return `<item>
        <title>${title}</title>
        <link>${link}</link>
        <guid>${link}</guid>
        <description>${description}</description>
        ${date ? `<pubDate>${xmlEscape(new Date(date).toUTCString())}</pubDate>` : ''}
      </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(SITE.name)} Blog Posts</title>
    <link>${SITE.url}/safari-updates</link>
    <description>Safari news, gorilla trekking notes, and East Africa travel updates from ${xmlEscape(SITE.name)}.</description>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
