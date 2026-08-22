import { pickDateValue, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

export function isUnreadNotification(record: RecordRow) {
  if (record.read === true || record.seen === true) return false;
  const status = pickString(record, ['status']).toLowerCase();
  if (status === 'read' || status === 'seen') return false;
  if (record.read === false || record.seen === false) return true;
  return status === 'unread' || status === 'new' || status === 'notice' || status === '';
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
  };
}

export const ADMIN_NOTIFICATIONS_EVENT = 'eton-admin-notifications';

export function notifyAdminNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_EVENT));
}
