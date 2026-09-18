'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCmsLive } from '@/lib/cms-live';
import { fetchCollectionRecords, isPublishedRecord } from '@/lib/data';
import {
  mergePublicDestinations,
  seededDestinations,
  splitNavDestinations,
  type PublicDestination,
} from '@/lib/public-destinations';

type NavContext = {
  destinations: PublicDestination[];
  primary: PublicDestination[];
  more: PublicDestination[];
};

const NavContext = createContext<NavContext | null>(null);

export function PublicDestinationsProvider({
  initialDestinations,
  children,
}: {
  initialDestinations: PublicDestination[];
  children: ReactNode;
}) {
  const live = useCmsLive();
  const [destinations, setDestinations] = useState<PublicDestination[]>(initialDestinations);

  useEffect(() => {
    setDestinations(initialDestinations);
  }, [initialDestinations]);

  useEffect(() => {
    if (live === 0) return;
    fetchCollectionRecords('countries', [], { maxRows: 48 })
      .then((rows) => setDestinations(mergePublicDestinations(rows.filter(isPublishedRecord))))
      .catch(() => setDestinations(seededDestinations()));
  }, [live]);

  const split = useMemo(() => splitNavDestinations(destinations), [destinations]);
  const value = useMemo(
    () => ({ destinations, primary: split.primary, more: split.more }),
    [destinations, split.primary, split.more]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function usePublicDestinationsFromContext(): NavContext | null {
  return useContext(NavContext);
}
