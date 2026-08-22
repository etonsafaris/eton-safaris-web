'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Info,
  Mail,
  MessageSquare,
  Trash2,
  Users,
} from 'lucide-react';
import { adminAuthHeaders, fetchAdminTable } from '@/lib/admin-records-client';
import { pickRecordId } from '@/lib/data';
import {
  isUnreadNotification,
  notificationCategory,
  notificationDate,
  notificationMessage,
  notificationTitle,
  notifyAdminNotificationsChanged,
} from '@/lib/notification-utils';
import type { RecordRow } from '@/lib/types';

type Filter = 'all' | 'unread' | 'system' | 'booking';

function relativeTime(value: string) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value;
  const diff = Date.now() - time;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function noticeKind(record: RecordRow) {
  const category = notificationCategory(record).toLowerCase();
  if (category === 'booking') return 'success';
  if (category === 'review' || category === 'warning') return 'warning';
  if (category === 'error') return 'error';
  return 'info';
}

function kindClass(kind: string) {
  if (kind === 'success') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (kind === 'warning') return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
  if (kind === 'error') return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
  return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
}

function KindIcon({ record }: { record: RecordRow }) {
  const category = notificationCategory(record).toLowerCase();
  const className = 'h-5 w-5';
  if (category === 'booking') return <CalendarCheck className={className} />;
  if (category === 'inquiry') return <MessageSquare className={className} />;
  if (category === 'subscriber') return <Mail className={className} />;
  if (category === 'agent') return <Users className={className} />;
  if (category === 'review') return <AlertTriangle className={className} />;
  if (noticeKind(record) === 'success') return <CheckCircle2 className={className} />;
  return <Info className={className} />;
}

export default function NotificationsModule() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchAdminTable('notifications');
      setRecords(
        rows.slice().sort((a, b) => notificationDate(b).localeCompare(notificationDate(a)))
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
      setRecords([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function inbox(action: 'mark-read' | 'mark-all-read' | 'delete', id?: string | number | null) {
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/inbox', {
      method: 'POST',
      credentials: 'include',
      headers: await adminAuthHeaders(),
      body: JSON.stringify({ action, table: 'notifications', id: id ?? undefined }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not update notifications.');
      return;
    }
    notifyAdminNotificationsChanged();
    await load();
  }

  const visible = useMemo(() => {
    return records.filter((row) => {
      const unread = isUnreadNotification(row);
      const category = notificationCategory(row).toLowerCase();
      if (filter === 'unread') return unread;
      if (filter === 'booking') return category === 'booking';
      if (filter === 'system') return category !== 'booking';
      return true;
    });
  }, [records, filter]);

  const hasUnread = records.some(isUnreadNotification);

  return (
    <div className="w-full space-y-6 pb-10 pt-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] dark:text-white">Notifications</h1>
          <p className="mt-1 font-medium text-gray-500 dark:text-gray-400">
            Stay updated with your latest alerts and activities
          </p>
        </div>
        <button
          type="button"
          disabled={saving || !hasUnread}
          onClick={() => void inbox('mark-all-read')}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-40 dark:border-white/10 dark:text-gray-200"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-2xl bg-gray-100/50 p-1 dark:bg-gray-800/50">
        {(['all', 'unread', 'system', 'booking'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`flex-1 rounded-xl px-6 py-2.5 text-sm font-bold capitalize transition-all sm:flex-none ${
              filter === id
                ? 'bg-white text-[#00A651] shadow-sm dark:bg-gray-700 dark:text-emerald-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-500">Loading notifications…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white/50 py-20 text-center dark:bg-gray-800/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-[#111827] dark:text-white">No notifications found</h3>
          <p className="mx-auto mt-1 max-w-xs text-gray-500 dark:text-gray-400">
            All caught up! We&apos;ll notify you when something important happens.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((record, index) => {
            const unread = isUnreadNotification(record);
            const id = pickRecordId(record);
            return (
              <article
                key={String(id ?? index)}
                className={`rounded-2xl p-5 transition-all ${
                  unread
                    ? 'bg-white shadow-sm ring-1 ring-[#00A651]/10 dark:bg-gray-800'
                    : 'bg-white/40 dark:bg-gray-800/20'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`h-fit flex-shrink-0 rounded-2xl p-2.5 ${kindClass(noticeKind(record))}`}>
                    <KindIcon record={record} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h3
                        className={`text-base font-bold ${
                          unread ? 'text-[#111827] dark:text-white' : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {notificationTitle(record)}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {relativeTime(notificationDate(record))}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${unread ? 'text-gray-600' : 'text-gray-500'}`}>
                      {notificationMessage(record) || 'No extra details were saved with this notification.'}
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      {unread ? (
                        <button
                          type="button"
                          disabled={saving || id == null}
                          onClick={() => void inbox('mark-read', id)}
                          className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#00A651] hover:underline disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark as read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving || id == null}
                        onClick={() => void inbox('delete', id)}
                        className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-rose-500 hover:underline disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                  {unread ? <div className="mt-2 h-2 w-2 rounded-full bg-[#00A651] shadow-sm" /> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
