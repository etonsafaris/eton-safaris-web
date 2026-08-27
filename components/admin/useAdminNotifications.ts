'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminTable } from '@/lib/admin-records-client';
import { ADMIN_NOTIFICATIONS_EVENT, unreadNotificationCount } from '@/lib/notification-utils';
import type { RecordRow } from '@/lib/types';

export function useAdminNotifications() {
  const [records, setRecords] = useState<RecordRow[]>([]);

  const load = useCallback(async () => {
    try {
      const rows = await fetchAdminTable('notifications');
      setRecords(
        rows.slice().sort((a, b) =>
          String(b.created_at || b.created_date || '').localeCompare(String(a.created_at || a.created_date || ''))
        )
      );
    } catch {
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    function onChange() {
      void load();
    }
    window.addEventListener(ADMIN_NOTIFICATIONS_EVENT, onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ADMIN_NOTIFICATIONS_EVENT, onChange);
      window.removeEventListener('focus', onChange);
    };
  }, [load]);

  return { records, unread: unreadNotificationCount(records), reload: load };
}
