import { pickDateValue, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

function isFlagTrue(value: unknown) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') return /^(true|1|yes|t|on|read|seen)$/i.test(value.trim());
  return false;
}

function isFlagFalse(value: unknown) {
  if (value === false || value === 0) return true;
  if (typeof value === 'string') return /^(false|0|no|f|off|unread)$/i.test(value.trim());
  return false;
}

export function isUnreadNotification(record: RecordRow) {
  const readValue = record.read ?? record.seen ?? record.is_read ?? record.isRead;
  // Explicitly marked read/seen → not unread.
  if (isFlagTrue(readValue) || record.read_at || record.seen_at) return false;
  const status = pickString(record, ['status']).toLowerCase();
  if (/^(read|seen|archived|done|closed)$/.test(status)) return false;
  // Explicit unread flags / statuses.
  if (isFlagFalse(readValue)) return true;
  if (/^(unread|new|notice|pending)$/.test(status)) return true;
  // Default for inbound dashboard notices: treat as unread unless marked read above.
  // (Older rows may lack status/read columns after column-fallback saves.)
  return true;
}

export function unreadNotificationCount(records: RecordRow[]) {
  return records.filter(isUnreadNotification).length;
}

export function notificationTitle(record: RecordRow) {
  return pickString(record, ['title', 'subject', 'name']) || 'Notification';
}

export function notificationMessage(record: RecordRow) {
  return pickString(record, ['message', 'body', 'content', 'excerpt']) || '';
}

export function notificationCategory(record: RecordRow) {
  return pickString(record, ['category', 'type']) || 'system';
}

export function notificationDate(record: RecordRow) {
  return pickDateValue(record, ['created_at', 'created_date', 'updated_at', 'updated_date']) || '';
}

export function markNotificationReadPayload() {
  return {
    status: 'Read',
    read: true,
    seen: true,
    is_read: true,
  };
}

export const ADMIN_NOTIFICATIONS_EVENT = 'eton-admin-notifications';

export function notifyAdminNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_EVENT));
}
