'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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

const HomePageContentContext = createContext<HomePageContent | null>(null);

/** One saved Home page footer for every public page, including client navigations. */
export function HomePageContentProvider({
  initial,
  children,
}: {
  initial?: HomePageContent | null;
  children: ReactNode;
}) {
  return <HomePageContentContext.Provider value={initial ?? null}>{children}</HomePageContentContext.Provider>;
}

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
  const shared = useContext(HomePageContentContext);
  const seed = initial ?? shared ?? null;
  const live = useCmsLive();
  const prevLive = useRef(live);
  const [content, setContent] = useState<HomePageContent>(seed ?? DEFAULT_HOME_PAGE_CONTENT);
  const [ready, setReady] = useState(Boolean(seed));

  useEffect(() => {
    const isLiveUpdate = live !== prevLive.current;
    prevLive.current = live;

    let cancelled = false;
    if (isLiveUpdate) setReady(false);

    fetchHomePageRecord()
      .then(async (row) => {
        if (cancelled) return;
        if (row && isPublishedRecord(row)) {
          const savedBody = String(
            row.content ||
              row.description ||
              row.body ||
              row.footer_about ||
              row.contact_address ||
              row.contact_email ||
              row.contact_emails ||
              ''
          );
          if (savedBody.trim() || !seed) setContent(parseHomePageContent(row));
        } else if (!seed) {
          setContent(DEFAULT_HOME_PAGE_CONTENT);
        }
        setReady(true);
      })
      .catch((error) => {
        console.error('[CMS] Home page content load failed:', error);
        if (!cancelled) {
          setContent(seed ?? DEFAULT_HOME_PAGE_CONTENT);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [live, seed]);

  return { ...content, ready };
}
