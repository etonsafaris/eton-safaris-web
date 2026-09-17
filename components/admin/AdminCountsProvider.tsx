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
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const next = await Promise.race([
          fetchAdminCounts(buildAdminCountItems()),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('Collection counts timed out')), 6000)
          ),
        ]);
        setCounts((current) => ({ ...current, ...next }));
        setLoading(false);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 1) await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
    }
    console.error('[Admin] Could not load collection counts:', lastError);
    setError(lastError instanceof Error ? lastError.message : 'Could not load collection counts');
    setLoading(false);
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
