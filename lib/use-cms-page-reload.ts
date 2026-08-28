'use client';

import { useEffect, useRef } from 'react';
import { clearCollectionCache } from '@/lib/collection-cache';
import { useCmsLive } from '@/lib/cms-live';

/**
 * Run `reload` on mount when the server did not supply content, or after an admin
 * save bumps CMS live in this browser. Skips the mount refetch when `hasServerContent`
 * is true so a refresh shows SSR data immediately without a stale→fresh flash.
 */
export function useCmsPageReload(
  reload: () => void | Promise<void>,
  hasServerContent: boolean,
  deps: readonly unknown[] = []
) {
  const live = useCmsLive();
  const prevLive = useRef(live);

  useEffect(() => {
    const isLiveUpdate = live !== prevLive.current;
    prevLive.current = live;
    if (!isLiveUpdate && hasServerContent) return;
    if (isLiveUpdate) clearCollectionCache();
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, hasServerContent, ...deps]);
}
