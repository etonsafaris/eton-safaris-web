'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { buildAdminCountItems } from '@/lib/admin-counts';
import { fetchAdminCounts } from '@/lib/admin-records-client';

type AdminCountsContextValue = {
  counts: Record<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AdminCountsContext = createContext<AdminCountsContextValue>({
  counts: {},
  loading: true,
  error: null,
  refresh: async () => {},
});

export function AdminCountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAdminCounts(buildAdminCountItems());
      setCounts(next);
    } catch (error) {
      console.error('[Admin] Could not load collection counts:', error);
      setError(error instanceof Error ? error.message : 'Could not load collection counts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AdminCountsContext.Provider value={{ counts, loading, error, refresh }}>
      {children}
    </AdminCountsContext.Provider>
  );
}

export function useAdminCounts() {
  return useContext(AdminCountsContext);
}
