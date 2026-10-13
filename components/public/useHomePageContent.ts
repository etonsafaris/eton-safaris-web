'use client';

import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { matchCmsRecord, pageAliases } from '@/lib/cms-routes';
import { fetchCollectionRecordById, fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import type { RecordRow } from '@/lib/types';
import {
  DEFAULT_HOME_PAGE_CONTENT,
  HOME_PAGE_SLUG,
  homeFieldPresent,
  parseHomePageContent,
  savedHomeFooter,
  type HomePageContent,
  type ReviewPlatformLink,
} from '@/lib/home-page-content';

const FOOTER_STORE = 'eton-saved-home-footer';

type StoredFooter = {
  footerAbout: string;
  contactAddress: string;
  reviewPlatforms: ReviewPlatformLink[];
};

function readStoredFooter(): StoredFooter {
  if (typeof sessionStorage === 'undefined') {
    return { footerAbout: '', contactAddress: '', reviewPlatforms: [] };
  }
  try {
    const parsed = JSON.parse(sessionStorage.getItem(FOOTER_STORE) || '') as StoredFooter;
    return {
      footerAbout: String(parsed?.footerAbout || ''),
      contactAddress: String(parsed?.contactAddress || ''),
      reviewPlatforms: Array.isArray(parsed?.reviewPlatforms) ? parsed.reviewPlatforms : [],
    };
  } catch {
    return { footerAbout: '', contactAddress: '', reviewPlatforms: [] };
  }
}

function writeStoredFooter(value: StoredFooter) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(FOOTER_STORE, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

const HomePageContentContext = createContext<HomePageContent | null>(null);

/** One saved Home page footer for every public page, including client navigations. */
export function HomePageContentProvider({
  initial,
  children,
}: {
  initial?: HomePageContent | null;
  children: ReactNode;
}) {
  return createElement(HomePageContentContext.Provider, { value: initial ?? null }, children);
}

const HOME_PAGE_INFLIGHT = '__etonHomePageRecord';

async function fetchHomePageRecord(): Promise<RecordRow | null> {
  const slot = globalThis as typeof globalThis & { [HOME_PAGE_INFLIGHT]?: Promise<RecordRow | null> | null };
  if (slot[HOME_PAGE_INFLIGHT]) return slot[HOME_PAGE_INFLIGHT];
  const pending = loadHomePageRecord().finally(() => {
    if (slot[HOME_PAGE_INFLIGHT] === pending) slot[HOME_PAGE_INFLIGHT] = null;
  });
  slot[HOME_PAGE_INFLIGHT] = pending;
  return pending;
}

async function loadHomePageRecord(): Promise<RecordRow | null> {
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
  const keptFooter = useRef<{ footerAbout: string; contactAddress: string }>({
    footerAbout: seed?.footerAbout && seed.footerAbout !== DEFAULT_HOME_PAGE_CONTENT.footerAbout ? seed.footerAbout : '',
    contactAddress:
      seed?.contactAddress && seed.contactAddress !== DEFAULT_HOME_PAGE_CONTENT.contactAddress ? seed.contactAddress : '',
  });

  useEffect(() => {
    const isLiveUpdate = live !== prevLive.current;
    prevLive.current = live;

    let cancelled = false;
    if (isLiveUpdate) setReady(false);

    fetchHomePageRecord()
      .then(async (row) => {
        if (cancelled) return;
        if (row && isPublishedRecord(row)) {
          const saved = savedHomeFooter(row);
          const stored = readStoredFooter();
          if (saved.footerAbout) keptFooter.current.footerAbout = saved.footerAbout;
          if (saved.contactAddress) keptFooter.current.contactAddress = saved.contactAddress;
          const parsed = parseHomePageContent(row);
          const footerAbout = saved.footerAbout || keptFooter.current.footerAbout || stored.footerAbout || parsed.footerAbout;
          const contactAddress = saved.contactAddress || keptFooter.current.contactAddress || stored.contactAddress;
          const reviewPlatforms = homeFieldPresent(row, 'review_platforms')
            ? parsed.reviewPlatforms
            : stored.reviewPlatforms.length
              ? stored.reviewPlatforms
              : parsed.reviewPlatforms;
          if (footerAbout || contactAddress || reviewPlatforms.length) {
            writeStoredFooter({ footerAbout, contactAddress, reviewPlatforms });
          }
          setContent({
            ...parsed,
            footerAbout,
            contactAddress,
            reviewPlatforms,
          });
        } else if (!seed && !keptFooter.current.contactAddress && !keptFooter.current.footerAbout) {
          const stored = readStoredFooter();
          setContent({
            ...DEFAULT_HOME_PAGE_CONTENT,
            footerAbout: stored.footerAbout || DEFAULT_HOME_PAGE_CONTENT.footerAbout,
            contactAddress: stored.contactAddress,
            reviewPlatforms: stored.reviewPlatforms,
          });
        }
        setReady(true);
      })
      .catch((error) => {
        console.error('[CMS] Home page content load failed:', error);
        if (!cancelled) {
          const stored = readStoredFooter();
          setContent((current) => {
            const base = seed ?? current;
            const contactAddress =
              keptFooter.current.contactAddress ||
              stored.contactAddress ||
              (base.contactAddress !== DEFAULT_HOME_PAGE_CONTENT.contactAddress ? base.contactAddress : '');
            return {
              ...base,
              footerAbout: keptFooter.current.footerAbout || stored.footerAbout || base.footerAbout,
              contactAddress,
              reviewPlatforms: base.reviewPlatforms.length ? base.reviewPlatforms : stored.reviewPlatforms,
            };
          });
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [live, seed]);

  return { ...content, ready };
}
