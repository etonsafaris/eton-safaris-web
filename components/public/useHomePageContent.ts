'use client';

import { useEffect, useRef, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecordById, fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import {
  DEFAULT_HOME_PAGE_CONTENT,
  HOME_PAGE_SLUG,
  parseHomePageContent,
  type HomePageContent,
} from '@/lib/home-page-content';

export function useHomePageContent(initial?: HomePageContent | null) {
  const live = useCmsLive();
  const prevLive = useRef(live);
  const [content, setContent] = useState<HomePageContent>(initial ?? DEFAULT_HOME_PAGE_CONTENT);
  const [ready, setReady] = useState(Boolean(initial));

  useEffect(() => {
    const isLiveUpdate = live !== prevLive.current;
    prevLive.current = live;
    if (!isLiveUpdate && initial) return;

    let cancelled = false;
    if (isLiveUpdate) setReady(false);

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
          setContent(DEFAULT_HOME_PAGE_CONTENT);
        }
        setReady(true);
      })
      .catch((error) => {
        console.error('[CMS] Home page content load failed:', error);
        if (!cancelled) {
          setContent(initial ?? DEFAULT_HOME_PAGE_CONTENT);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [live, initial]);

  return { ...content, ready };
}
