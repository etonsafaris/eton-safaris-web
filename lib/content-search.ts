import {
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  pickPlainText,
  pickString,
} from '@/lib/data';
import { scoreTourMatch } from '@/lib/tour-search';
import type { RecordRow } from '@/lib/types';

export function searchLanguagePosts(posts: RecordRow[], query: string, limit = 4): RecordRow[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  return posts
    .filter(isPublishedRecord)
    .filter(isLanguagePost)
    .filter((post) => scoreTourMatch(post, trimmed) > 0)
    .slice(0, limit);
}

export function languagePostSearchCard(post: RecordRow) {
  return {
    href: `/safari-updates/${pickString(post, ['slug']) || post.id}`,
    title: getRecordTitle(post),
    excerpt: pickPlainText(post, ['excerpt', 'description', 'focus_keyphrase']),
  };
}
