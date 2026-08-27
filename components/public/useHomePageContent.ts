'use client';

import { useEffect, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecordById, fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import {
  DEFAULT_HOME_PAGE_CONTENT,
  HOME_PAGE_SLUG,
  parseHomePageContent,
  type HomePageContent,
} from '@/lib/home-page-content';

const EMPTY_UNTIL_LOADED: HomePageContent = {
  ...DEFAULT_HOME_PAGE_CONTENT,
};

export function useHomePageContent() {
  const live = useCmsLive();
  const [content, setContent] = useState<HomePageContent>(EMPTY_UNTIL_LOADED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    fetchCollectionRecords('pages')
      .then(async (rows) => {
        if (cancelled) return;
        const match =
          matchCmsRecord(rows, HOME_PAGE_SLUG, pageAliases(HOME_PAGE_SLUG).concat(['home', 'homepage'])) ||
          rows.find((row) => String(row.layout || '').toLowerCase() === 'home') ||
          null;
        if (match && isPublishedRecord(match)) {
          const id = String(match.id || '');
          const full = id ? await fetchCollectionRecordById('pages', id) : match;
          if (cancelled) return;
          setContent(parseHomePageContent(full || match));
        } else {
          setContent(EMPTY_UNTIL_LOADED);
        }
        setReady(true);
      })
      .catch((error) => {
        console.error('[CMS] Home page content load failed:', error);
        if (!cancelled) {
          setContent(EMPTY_UNTIL_LOADED);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  return { ...content, ready };
}
