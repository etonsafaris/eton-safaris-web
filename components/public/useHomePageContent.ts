'use client';

import { useEffect, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import {
  DEFAULT_HOME_PAGE_CONTENT,
  HOME_PAGE_SLUG,
  parseHomePageContent,
  type HomePageContent,
} from '@/lib/home-page-content';

export function useHomePageContent() {
  const live = useCmsLive();
  const [content, setContent] = useState<HomePageContent>(DEFAULT_HOME_PAGE_CONTENT);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionRecords('pages')
      .then((rows) => {
        if (cancelled) return;
        const match =
          matchCmsRecord(rows, HOME_PAGE_SLUG, pageAliases(HOME_PAGE_SLUG).concat(['home', 'homepage'])) ||
          rows.find((row) => String(row.layout || '').toLowerCase() === 'home') ||
          null;
        if (match && isPublishedRecord(match)) {
          setContent(parseHomePageContent(match));
        } else {
          setContent(DEFAULT_HOME_PAGE_CONTENT);
        }
      })
      .catch((error) => {
        console.error('[CMS] Home page content load failed:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  return content;
}
