'use client';

import { useEffect, useRef, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecordById, fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import type { RecordRow } from '@/lib/types';
import {
  DEFAULT_HOME_PAGE_CONTENT,
  HOME_PAGE_SLUG,
  parseHomePageContent,
  type HomePageContent,
} from '@/lib/home-page-content';

async function fetchHomePageRecord(): Promise<RecordRow | null> {
  const params = new URLSearchParams({
    'eq.slug': HOME_PAGE_SLUG,
    limit: '1',
    select: '*',
  });
  const response = await fetch(`/api/data/pages?${params}`, { cache: 'no-store', credentials: 'same-origin' });
  if (response.ok) {
    const body = (await response.json().catch(() => ({}))) as { data?: RecordRow[] };
    if (body.data?.[0]) return body.data[0];
  }

  const rows = await fetchCollectionRecords('pages', [], { maxRows: 80 });
  const match =
    matchCmsRecord(rows, HOME_PAGE_SLUG, pageAliases(HOME_PAGE_SLUG).concat(['home', 'homepage'])) ||
    rows.find((row) => String(row.layout || '').toLowerCase() === 'home') ||
    null;
  if (!match) return null;
  const id = String(match.id || '');
  return id ? (await fetchCollectionRecordById('pages', id)) || match : match;
}

export function useHomePageContent(initial?: HomePageContent | null) {
  const live = useCmsLive();
  const prevLive = useRef(live);
  const [content, setContent] = useState<HomePageContent>(initial ?? DEFAULT_HOME_PAGE_CONTENT);
  const [ready, setReady] = useState(Boolean(initial));

  useEffect(() => {
    const isLiveUpdate = live !== prevLive.current;
    prevLive.current = live;

    let cancelled = false;
    if (isLiveUpdate) setReady(false);

    fetchHomePageRecord()
      .then(async (row) => {
        if (cancelled) return;
        if (row && isPublishedRecord(row)) {
          const savedBody = String(row.content || row.description || row.body || row.footer_about || '');
          if (savedBody.trim() || !initial) setContent(parseHomePageContent(row));
        } else if (!initial) {
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
