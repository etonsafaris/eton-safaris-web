'use client';

import { X } from 'lucide-react';
import { formatPublishedDate } from '@/components/public/PostMetaBar';
import { statusBadgeClass } from '@/components/admin/OpsRecordTable';
import {
  notificationCategory,
  notificationDate,
  notificationMessage,
  notificationTitle,
} from '@/lib/notification-utils';
import type { RecordRow } from '@/lib/types';

export default function NotificationDetailModal({
  record,
  onClose,
}: {
  record: RecordRow;
  onClose: () => void;
}) {
  const title = notificationTitle(record);
  const message = notificationMessage(record);
  const category = notificationCategory(record);
  const date = notificationDate(record);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#161b22] sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A651]">Notification</p>
            <h3 className="mt-1 font-serif text-2xl font-bold text-[#111827] dark:text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close notification" className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(category)}`}>
            {category}
          </span>
          {date ? <span className="text-[#6b7280]">{formatPublishedDate(date)}</span> : null}
        </div>
        <div className="mt-6 whitespace-pre-wrap rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm leading-relaxed text-[#111827] dark:border-white/10 dark:bg-[#0a0c10] dark:text-gray-200">
          {message || 'No extra details were saved with this notification.'}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#00A651] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00945a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
