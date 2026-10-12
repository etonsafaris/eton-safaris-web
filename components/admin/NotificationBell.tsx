'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import NotificationDetailModal from '@/components/admin/NotificationDetailModal';
import { useAdminNotifications } from '@/components/admin/useAdminNotifications';
import { pickRecordId } from '@/lib/data';
import {
  isUnreadNotification,
  notificationCategory,
  notificationDate,
  notificationMessage,
  notificationTitle,
  notifyAdminNotificationsChanged,
} from '@/lib/notification-utils';
import { adminAuthHeaders } from '@/lib/admin-records-client';
import type { RecordRow } from '@/lib/types';

export default function NotificationBell() {
  const { records, unread, reload } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<RecordRow | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  async function markAllRead() {
    if (unread === 0) return;
    await fetch('/api/admin/inbox', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({ action: 'mark-all-read', table: 'notifications' }),
    });
    notifyAdminNotificationsChanged();
    void reload();
  }

  async function openNotice(record: RecordRow) {
    setViewing(record);
    setOpen(false);
    const id = pickRecordId(record);
    if (id == null || !isUnreadNotification(record)) return;
    await fetch('/api/admin/inbox', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({ action: 'mark-read', table: 'notifications', id }),
    });
    notifyAdminNotificationsChanged();
    void reload();
  }

  const preview = records.slice(0, 8);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /> : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <button
              type="button"
              disabled={unread === 0}
              onClick={() => void markAllRead()}
              className="text-sm text-[#00A651] hover:text-[#009247] disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {preview.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet.</p>
            ) : (
              preview.map((record, index) => {
                const unreadItem = isUnreadNotification(record);
                const date = notificationDate(record);
                const detail = notificationMessage(record) || notificationCategory(record);
                return (
                  <button
                    key={String(pickRecordId(record) ?? index)}
                    type="button"
                    onClick={() => void openNotice(record)}
                    className="w-full border-b border-gray-50 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#00A651] dark:bg-emerald-500/20 dark:text-emerald-400">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-900 dark:text-white">
                          {notificationTitle(record)}
                          {unreadItem ? <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" /> : null}
                        </p>
                        {detail ? <p className="mt-1 line-clamp-2 text-xs text-gray-500">{detail}</p> : null}
                        {date ? <p className="mt-1 text-xs text-gray-500">{formatPublishedDate(date)}</p> : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="bg-gray-50 p-3 text-center dark:bg-gray-800/50">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#00A651] hover:text-[#009247]"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}

      {viewing ? <NotificationDetailModal record={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
