'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePublicDestinationsFromContext } from '@/components/public/PublicDestinationsProvider';
import { useCmsLive } from '@/lib/cms-live';
import { fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import {
  mergePublicDestinations,
  seededDestinations,
  splitNavDestinations,
  type PublicDestination,
} from '@/lib/public-destinations';

/** Prefer server-fed nav from PublicShell; only fetch in the browser when no provider exists. */
export function usePublicDestinations() {
  const fromShell = usePublicDestinationsFromContext();
  const live = useCmsLive();
  const [destinations, setDestinations] = useState<PublicDestination[]>(() => mergePublicDestinations([]));

  useEffect(() => {
    if (fromShell) return;
    let cancelled = false;
    fetchCollectionRecords('countries', [], { maxRows: 48 })
      .then((rows) => {
        if (!cancelled) setDestinations(mergePublicDestinations(rows.filter(isPublishedRecord)));
      })
      .catch((error) => {
        console.error('[Supabase] Failed to load public destinations:', error);
        if (!cancelled) setDestinations(seededDestinations());
      });
    return () => {
      cancelled = true;
    };
  }, [fromShell, live]);

  const split = useMemo(() => splitNavDestinations(fromShell?.destinations ?? destinations), [fromShell, destinations]);
  if (fromShell) return fromShell;
  return { destinations, primary: split.primary, more: split.more };
}
