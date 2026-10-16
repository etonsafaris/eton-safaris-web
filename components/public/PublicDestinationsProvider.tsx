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
  const [destinations, setDestinations] = useState<PublicDestination[]>(() =>
    initialDestinations.length ? initialDestinations : mergePublicDestinations([])
  );

  useEffect(() => {
    if (initialDestinations.length) setDestinations(initialDestinations);
  }, [initialDestinations]);

  useEffect(() => {
    // Seeded nav is enough for first paint; only refetch after an admin CMS live bump.
    if (live === 0 && destinations.length > 0) return undefined;
    let cancelled = false;
    fetchCollectionRecords('countries', [], { maxRows: 48 })
      .then((rows) => {
        if (cancelled) return;
        const merged = mergePublicDestinations(rows.filter(isPublishedRecord));
        setDestinations((current) => (merged.length ? merged : current.length ? current : seededDestinations()));
      })
      .catch(() => {
        if (cancelled) return;
        setDestinations((current) => (current.length ? current : seededDestinations()));
      });
    return () => {
      cancelled = true;
    };
  }, [live, destinations.length]);

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
