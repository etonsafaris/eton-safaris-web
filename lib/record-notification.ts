import { saveWithColumnFallback } from '@/lib/supabase-save';
import { createPrivilegedClient } from '@/lib/supabase/admin';

export type DashboardNotice = {
  title: string;
  message: string;
  category?: string;
};

/**
 * Persist an unread dashboard notification for the admin Notifications module + red badge.
 */
export async function recordDashboardNotice(input: DashboardNotice) {
  const client = createPrivilegedClient();
  const title = input.title.trim() || 'Eton Safaris notification';
  const message = input.message.trim() || title;
  const category = input.category || 'system';
  const now = new Date().toISOString();

  const payload = {
    title,
    message,
    category,
    body: message,
    content: message,
    status: 'Unread',
    read: false,
    seen: false,
    is_read: false,
    created_at: now,
  };

  let result = await saveWithColumnFallback('notifications', payload, { client });
  if (result.error) {
    // Minimal fallback if some unread columns are missing from the table.
    result = await saveWithColumnFallback(
      'notifications',
      { title, message, category, status: 'Unread' },
      { client }
    );
  }
  if (result.error) {
    console.error('[Notifications] Failed to save dashboard notice:', result.error);
    if (/row-level security|permission denied|42501|Could not find the table/i.test(result.error.message)) {
      console.error(
        '[Notifications] Run scripts/fix-inbox-rls.sql in the Supabase SQL editor, and add SUPABASE_SERVICE_ROLE_KEY to .env.local.'
      );
    }
  }
  return result;
}
