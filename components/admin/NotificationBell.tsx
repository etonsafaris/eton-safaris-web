'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import NotificationDetailModal from '@/components/admin/NotificationDetailModal';
import { useAdminNotifications } from '@/components/admin/useAdminNotifications';
import { pickRecordId } from '@/lib/data';
import { pickRecordId } from '@/lib/data';
import {
  ADMIN_NOTIFICATIONS_EVENT,
  isUnreadNotification,
  markNotificationReadPayload,
  notificationCategory,
  notificationDate,
  notificationMessage,
  notificationTitle,
  notifyAdminNotificationsChanged,
  unreadNotificationCount,
} from '@/lib/notification-utils';
import { saveWithColumnFallback } from '@/lib/supabase-save';
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

  async function openNotice(record: RecordRow) {
    setViewing(record);
    setOpen(false);
    const id = pickRecordId(record);
    if (id == null || !isUnreadNotification(record)) return;
    await saveWithColumnFallback('notifications', markNotificationReadPayload(), id);
    notifyAdminNotificationsChanged();
    setRecords((current) =>
      current.map((row) => (pickRecordId(row) === id ? { ...row, ...markNotificationReadPayload() } : row))
    );
  }

  const unread = unreadNotificationCount(records);
  const preview = records.slice(0, 8);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-[#6b7280] hover:bg-[#f3f4f6] dark:text-gray-300 dark:hover:bg-white/5"
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-xl dark:border-white/10 dark:bg-[#161b22]">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3 dark:border-white/10">
            <p className="text-sm font-semibold text-[#111827] dark:text-white">Notifications</p>
            {unread > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread} unread</span>
            ) : (
              <span className="text-xs text-[#6b7280]">All caught up</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {preview.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#6b7280]">No notifications yet.</p>
            ) : (
              preview.map((record, index) => {
                const unreadItem = isUnreadNotification(record);
                const date = notificationDate(record);
                return (
                  <button
                    key={String(pickRecordId(record) ?? index)}
                    type="button"
                    onClick={() => void openNotice(record)}
                    className={`flex w-full flex-col items-start gap-1 border-b border-[#f3f4f6] px-4 py-3 text-left hover:bg-[#f8fafc] dark:border-white/5 dark:hover:bg-white/5 ${
                      unreadItem ? 'bg-[#ecfdf5]' : 'bg-white dark:bg-[#161b22]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#111827] dark:text-white">{notificationTitle(record)}</p>
                      {unreadItem ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /> : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-[#6b7280]">{notificationMessage(record) || notificationCategory(record)}</p>
                    {date ? <p className="text-[11px] text-[#9ca3af]">{formatPublishedDate(date)}</p> : null}
                  </button>
                );
              })
            )}
          </div>
          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            className="block bg-[#f8fafc] px-4 py-3 text-center text-sm font-semibold text-[#00A651] hover:bg-[#ecfdf5] dark:bg-white/5"
          >
            View all notifications
          </Link>
        </div>
      ) : null}

      {viewing ? <NotificationDetailModal record={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
