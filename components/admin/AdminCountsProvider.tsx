'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { buildAdminCountItems } from '@/lib/admin-counts';
import { fetchAdminCounts } from '@/lib/admin-records-client';

type AdminCountsContextValue = {
  counts: Record<string, number>;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AdminCountsContext = createContext<AdminCountsContextValue>({
  counts: {},
  loading: true,
  refresh: async () => {},
});

export function AdminCountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAdminCounts(buildAdminCountItems());
      setCounts(next);
    } catch (error) {
      console.error('[Admin] Could not load collection counts:', error);
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AdminCountsContext.Provider value={{ counts, loading, refresh }}>
      {children}
    </AdminCountsContext.Provider>
  );
}

export function useAdminCounts() {
  return useContext(AdminCountsContext);
}
