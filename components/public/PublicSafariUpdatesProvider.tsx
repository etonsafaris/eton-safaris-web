'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import {
  fetchCollectionRecords,
  getRecordTitle,
  isLanguagePost,
  isPublishedRecord,
  publicRecordSlug,
} from '@/lib/data';
import type { PublicSafariUpdateNavItem } from '@/lib/load-public';
import type { RecordRow } from '@/lib/types';

type SafariUpdatesContext = {
  items: PublicSafariUpdateNavItem[];
};

const SafariUpdatesContext = createContext<SafariUpdatesContext | null>(null);

const NAV_LIMIT = 8;

function toNavItems(rows: RecordRow[]): PublicSafariUpdateNavItem[] {
  return rows
    .filter(isPublishedRecord)
    .filter((row) => !isLanguagePost(row))
    .slice(0, NAV_LIMIT)
    .map((post) => {
      const slug = publicRecordSlug(post) || String(post.id ?? '');
      return {
        title: getRecordTitle(post) || 'Safari update',
        href: slug ? `/safari-updates/${slug}` : '/safari-updates',
      };
    });
}

export function PublicSafariUpdatesProvider({
  initialItems,
  children,
}: {
  initialItems: PublicSafariUpdateNavItem[];
  children: ReactNode;
}) {
  const live = useCmsLive();
  const [items, setItems] = useState<PublicSafariUpdateNavItem[]>(() => initialItems);

  useEffect(() => {
    if (initialItems.length) setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (live === 0) return;
    fetchCollectionRecords('safari_updates', [], { maxRows: NAV_LIMIT })
      .then((rows) => {
        const next = toNavItems(rows);
        if (next.length) setItems(next);
      })
      .catch(() => {
        /* keep server-fed list */
      });
  }, [live]);

  const value = useMemo(() => ({ items }), [items]);

  return <SafariUpdatesContext.Provider value={value}>{children}</SafariUpdatesContext.Provider>;
}

export function usePublicSafariUpdatesFromContext(): SafariUpdatesContext | null {
  return useContext(SafariUpdatesContext);
}
