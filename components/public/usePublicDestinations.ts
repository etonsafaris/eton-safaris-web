'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { fetchCollectionRecords } from '@/lib/data';
import {
  mergePublicDestinations,
  seededDestinations,
  splitNavDestinations,
  type PublicDestination,
} from '@/lib/public-destinations';

export function usePublicDestinations() {
  const live = useCmsLive();
  const [destinations, setDestinations] = useState<PublicDestination[]>(() => mergePublicDestinations([]));

  useEffect(() => {
    let cancelled = false;
    fetchCollectionRecords('countries')
      .then((rows) => {
        if (!cancelled) setDestinations(mergePublicDestinations(rows));
      })
      .catch((error) => {
        console.error('[Supabase] Failed to load public destinations:', error);
        if (!cancelled) setDestinations(seededDestinations());
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  const split = useMemo(() => splitNavDestinations(destinations), [destinations]);
  return { destinations, primary: split.primary, more: split.more };
}
