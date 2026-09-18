'use client';

import { useEffect, useState } from 'react';
import { usePublicSafariUpdatesFromContext } from '@/components/public/PublicSafariUpdatesProvider';
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

/** Prefer server-fed nav from PublicShell; fetch in the browser when no provider exists. */
export function usePublicSafariUpdates() {
  const fromShell = usePublicSafariUpdatesFromContext();
  const live = useCmsLive();
  const [items, setItems] = useState<PublicSafariUpdateNavItem[]>([]);

  useEffect(() => {
    if (fromShell) return;
    let cancelled = false;
    fetchCollectionRecords('safari_updates', [], { maxRows: NAV_LIMIT })
      .then((rows) => {
        if (!cancelled) setItems(toNavItems(rows));
      })
      .catch(() => {
        /* optional nav */
      });
    return () => {
      cancelled = true;
    };
  }, [fromShell, live]);

  if (fromShell) return fromShell;
  return { items };
}
